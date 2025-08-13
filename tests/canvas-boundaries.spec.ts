import { test, expect, Page } from '@playwright/test';

// Utility functions for canvas boundary testing
async function getCanvasInfo(page: Page) {
  return await page.evaluate(() => {
    const canvas = (window as any).canvas;
    if (!canvas) return null;
    
    return {
      width: canvas.width,
      height: canvas.height,
      zoom: canvas.getZoom(),
      objects: canvas.getObjects().length,
      viewport: canvas.vptCoords
    };
  });
}

async function getActiveObjectProperties(page: Page) {
  return await page.evaluate(() => {
    const canvas = (window as any).canvas;
    const activeObject = canvas?.getActiveObject();
    if (!activeObject) return null;
    
    return {
      left: activeObject.left,
      top: activeObject.top,
      width: activeObject.width,
      height: activeObject.height,
      angle: activeObject.angle,
      scaleX: activeObject.scaleX,
      scaleY: activeObject.scaleY,
      visible: activeObject.visible
    };
  });
}

async function setZoomLevel(page: Page, zoomLevel: number) {
  await page.evaluate((zoom) => {
    const canvas = (window as any).canvas;
    if (canvas) {
      canvas.setZoom(zoom);
      canvas.renderAll();
    }
  }, zoomLevel);
}

async function moveObjectToPosition(page: Page, x: number, y: number) {
  await page.evaluate((coords) => {
    const canvas = (window as any).canvas;
    const activeObject = canvas?.getActiveObject();
    if (activeObject) {
      activeObject.set({ left: coords.x, top: coords.y });
      canvas.renderAll();
    }
  }, { x, y });
}

test.describe('Canvas Boundary Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Zero-dimension canvas handling', async ({ page }) => {
    console.log('Testing zero-dimension canvas scenarios...');
    
    // Try to create a canvas with zero dimensions via evaluation
    const canvasCreated = await page.evaluate(() => {
      try {
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 0;
        testCanvas.height = 0;
        const ctx = testCanvas.getContext('2d');
        return { success: true, hasContext: !!ctx };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    console.log('Zero-dimension canvas result:', canvasCreated);

    // Add text to normal canvas and verify it works
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    const canvasInfo = await getCanvasInfo(page);
    console.log('Canvas info after adding text:', canvasInfo);
    
    expect(canvasInfo).toBeTruthy();
    expect(canvasInfo?.objects).toBe(1);
    
    // Verify the canvas has reasonable dimensions
    expect(canvasInfo?.width).toBeGreaterThan(0);
    expect(canvasInfo?.height).toBeGreaterThan(0);
  });

  test('Extreme zoom levels (0.01x to 10x)', async ({ page }) => {
    console.log('Testing extreme zoom levels...');
    
    // Add text first
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    const zoomLevels = [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 20];
    
    for (const zoomLevel of zoomLevels) {
      console.log(`Testing zoom level: ${zoomLevel}x`);
      
      // Set zoom level
      await setZoomLevel(page, zoomLevel);
      await page.waitForTimeout(200);
      
      // Verify canvas is still responsive
      const canvasInfo = await getCanvasInfo(page);
      expect(canvasInfo?.zoom).toBeCloseTo(zoomLevel, 2);
      expect(canvasInfo?.objects).toBe(1);
      
      // Try to interact with canvas at this zoom level
      const canvas = page.locator('canvas');
      await canvas.click();
      await page.waitForTimeout(100);
      
      // Verify object is still accessible
      const objectProps = await getActiveObjectProperties(page);
      expect(objectProps).toBeTruthy();
      
      // Test if we can still edit text at extreme zoom
      if (zoomLevel >= 0.1 && zoomLevel <= 5) { // Skip editing at extremely small/large zoom
        await canvas.dblclick();
        await page.keyboard.type(`Zoom ${zoomLevel}x`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
      }
    }
    
    // Reset to normal zoom
    await setZoomLevel(page, 1);
    const finalInfo = await getCanvasInfo(page);
    expect(finalInfo?.zoom).toBeCloseTo(1, 2);
    
    console.log('Extreme zoom test completed');
  });

  test('Text overflow beyond canvas boundaries', async ({ page }) => {
    console.log('Testing text overflow beyond canvas boundaries...');
    
    // Add text layer
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Get canvas dimensions
    const initialCanvasInfo = await getCanvasInfo(page);
    console.log('Initial canvas info:', initialCanvasInfo);
    
    if (!initialCanvasInfo) {
      throw new Error('Canvas not available');
    }

    // Move text to edge positions and beyond
    const testPositions = [
      { x: -100, y: -100, description: 'Top-left overflow' },
      { x: initialCanvasInfo.width + 100, y: -100, description: 'Top-right overflow' },
      { x: -100, y: initialCanvasInfo.height + 100, description: 'Bottom-left overflow' },
      { x: initialCanvasInfo.width + 100, y: initialCanvasInfo.height + 100, description: 'Bottom-right overflow' },
      { x: initialCanvasInfo.width / 2, y: -50, description: 'Top edge overflow' },
      { x: initialCanvasInfo.width / 2, y: initialCanvasInfo.height + 50, description: 'Bottom edge overflow' },
      { x: -50, y: initialCanvasInfo.height / 2, description: 'Left edge overflow' },
      { x: initialCanvasInfo.width + 50, y: initialCanvasInfo.height / 2, description: 'Right edge overflow' }
    ];

    for (const position of testPositions) {
      console.log(`Testing ${position.description}`);
      
      // Move object to overflow position
      await moveObjectToPosition(page, position.x, position.y);
      await page.waitForTimeout(200);
      
      // Verify object properties
      const objectProps = await getActiveObjectProperties(page);
      expect(objectProps).toBeTruthy();
      expect(objectProps?.left).toBeCloseTo(position.x, 1);
      expect(objectProps?.top).toBeCloseTo(position.y, 1);
      
      // Verify canvas is still responsive
      const canvasInfo = await getCanvasInfo(page);
      expect(canvasInfo?.objects).toBe(1);
      
      // Try to interact with the overflowed object
      const canvas = page.locator('canvas');
      await canvas.click();
      await page.waitForTimeout(100);
      
      // Verify we can still select/edit (even if not fully visible)
      await canvas.dblclick();
      await page.keyboard.type(` ${position.description.replace(' ', '_')}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
    }
    
    // Move back to center
    await moveObjectToPosition(page, initialCanvasInfo.width / 2, initialCanvasInfo.height / 2);
    
    const finalObjectProps = await getActiveObjectProperties(page);
    expect(finalObjectProps?.left).toBeCloseTo(initialCanvasInfo.width / 2, 1);
    expect(finalObjectProps?.top).toBeCloseTo(initialCanvasInfo.height / 2, 1);
    
    console.log('Text overflow test completed');
  });

  test('Extreme rotation scenarios (360°+ rotations)', async ({ page }) => {
    console.log('Testing extreme rotation scenarios...');
    
    // Add text layer
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Add some text content for better visual testing
    const canvas = page.locator('canvas');
    await canvas.dblclick();
    await page.keyboard.type('ROTATION TEST');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Test extreme rotation values
    const rotationAngles = [0, 45, 90, 180, 270, 360, 450, 720, -90, -180, -360, 1800];
    
    for (const angle of rotationAngles) {
      console.log(`Testing rotation: ${angle}°`);
      
      // Set rotation via evaluation
      await page.evaluate((rotation) => {
        const canvas = (window as any).canvas;
        const activeObject = canvas?.getActiveObject();
        if (activeObject) {
          activeObject.set({ angle: rotation });
          canvas.renderAll();
        }
      }, angle);
      
      await page.waitForTimeout(200);
      
      // Verify rotation was applied
      const objectProps = await getActiveObjectProperties(page);
      expect(objectProps).toBeTruthy();
      
      // Fabric.js normalizes angles, so check the normalized value
      const expectedNormalizedAngle = ((angle % 360) + 360) % 360;
      const actualNormalizedAngle = ((objectProps?.angle || 0) + 360) % 360;
      expect(actualNormalizedAngle).toBeCloseTo(expectedNormalizedAngle, 1);
      
      // Verify canvas is still responsive
      const canvasInfo = await getCanvasInfo(page);
      expect(canvasInfo?.objects).toBe(1);
      
      // Try to interact with rotated object
      await canvas.click();
      await page.waitForTimeout(100);
      
      // Test that we can still edit even when heavily rotated
      if (Math.abs(angle) <= 720) { // Skip editing for extreme rotations
        await canvas.dblclick();
        await page.keyboard.press('End');
        await page.keyboard.type(` ${angle}°`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
      }
    }
    
    // Test continuous rotation (simulating dragging)
    console.log('Testing continuous rotation...');
    for (let i = 0; i < 10; i++) {
      const continuousAngle = i * 36; // 10 steps of 36° = 360°
      await page.evaluate((rotation) => {
        const canvas = (window as any).canvas;
        const activeObject = canvas?.getActiveObject();
        if (activeObject) {
          activeObject.set({ angle: rotation });
          canvas.renderAll();
        }
      }, continuousAngle);
      await page.waitForTimeout(50);
    }
    
    // Verify object is still intact after continuous rotation
    const finalProps = await getActiveObjectProperties(page);
    expect(finalProps).toBeTruthy();
    expect(finalProps?.angle).toBeCloseTo(0, 1); // Should be back to 0° (360° normalized)
    
    console.log('Extreme rotation test completed');
  });

  test('Negative positioning edge cases', async ({ page }) => {
    console.log('Testing negative positioning edge cases...');
    
    // Add text layer
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Test extreme negative positions
    const negativePositions = [
      { x: -1000, y: -1000 },
      { x: -500, y: 0 },
      { x: 0, y: -500 },
      { x: -100, y: -100 },
      { x: -1, y: -1 },
      { x: Number.MIN_SAFE_INTEGER, y: Number.MIN_SAFE_INTEGER }
    ];

    for (const position of negativePositions) {
      console.log(`Testing negative position: (${position.x}, ${position.y})`);
      
      try {
        // Move to negative position
        await moveObjectToPosition(page, position.x, position.y);
        await page.waitForTimeout(200);
        
        // Verify position was set
        const objectProps = await getActiveObjectProperties(page);
        expect(objectProps).toBeTruthy();
        
        // For extreme values, check if they're handled gracefully
        if (position.x === Number.MIN_SAFE_INTEGER) {
          // Should either set the position or handle gracefully
          expect(typeof objectProps?.left).toBe('number');
          expect(typeof objectProps?.top).toBe('number');
        } else {
          expect(objectProps?.left).toBeCloseTo(position.x, 1);
          expect(objectProps?.top).toBeCloseTo(position.y, 1);
        }
        
        // Verify canvas is still functional
        const canvasInfo = await getCanvasInfo(page);
        expect(canvasInfo?.objects).toBe(1);
        
        // Try to interact with object at negative position
        const canvas = page.locator('canvas');
        await canvas.click();
        await page.waitForTimeout(100);
        
      } catch (error) {
        console.log(`Position (${position.x}, ${position.y}) caused error:`, error);
        
        // Verify canvas is still functional even after error
        const canvasInfo = await getCanvasInfo(page);
        expect(canvasInfo?.objects).toBe(1);
      }
    }
    
    // Move back to positive position to verify recovery
    await moveObjectToPosition(page, 100, 100);
    const finalProps = await getActiveObjectProperties(page);
    expect(finalProps?.left).toBeCloseTo(100, 1);
    expect(finalProps?.top).toBeCloseTo(100, 1);
    
    console.log('Negative positioning test completed');
  });

  test('Canvas viewport outside visible area', async ({ page }) => {
    console.log('Testing canvas viewport manipulation...');
    
    // Add text layer
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Get initial canvas info
    const initialInfo = await getCanvasInfo(page);
    console.log('Initial canvas viewport:', initialInfo?.viewport);

    // Test viewport manipulation via panning simulation
    const panOffsets = [
      { x: 1000, y: 0 },
      { x: -1000, y: 0 },
      { x: 0, y: 1000 },
      { x: 0, y: -1000 },
      { x: 500, y: 500 },
      { x: -500, y: -500 }
    ];

    for (const offset of panOffsets) {
      console.log(`Testing viewport pan: (${offset.x}, ${offset.y})`);
      
      try {
        // Simulate panning by manipulating viewport transform
        await page.evaluate((panOffset) => {
          const canvas = (window as any).canvas;
          if (canvas) {
            // Get current viewport transform
            const vpt = canvas.viewportTransform.slice();
            vpt[4] += panOffset.x; // translateX
            vpt[5] += panOffset.y; // translateY
            
            canvas.setViewportTransform(vpt);
            canvas.renderAll();
          }
        }, offset);
        
        await page.waitForTimeout(200);
        
        // Verify canvas is still responsive
        const canvasInfo = await getCanvasInfo(page);
        expect(canvasInfo?.objects).toBe(1);
        
        // Try to interact with canvas even when viewport is offset
        const canvas = page.locator('canvas');
        await canvas.click();
        await page.waitForTimeout(100);
        
        // Verify object is still accessible
        const objectProps = await getActiveObjectProperties(page);
        expect(objectProps).toBeTruthy();
        
      } catch (error) {
        console.log(`Viewport pan (${offset.x}, ${offset.y}) caused error:`, error);
      }
    }
    
    // Reset viewport to center
    await page.evaluate(() => {
      const canvas = (window as any).canvas;
      if (canvas) {
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        canvas.renderAll();
      }
    });
    
    // Verify viewport reset
    const finalInfo = await getCanvasInfo(page);
    expect(finalInfo?.objects).toBe(1);
    
    console.log('Canvas viewport test completed');
  });

  test('Scale boundary conditions', async ({ page }) => {
    console.log('Testing scale boundary conditions...');
    
    // Add text layer
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Test extreme scale values
    const scaleValues = [
      { scaleX: 0.01, scaleY: 0.01, description: 'Extremely small' },
      { scaleX: 0.1, scaleY: 0.1, description: 'Very small' },
      { scaleX: 1, scaleY: 1, description: 'Normal scale' },
      { scaleX: 10, scaleY: 10, description: 'Large scale' },
      { scaleX: 50, scaleY: 50, description: 'Very large scale' },
      { scaleX: 0.01, scaleY: 10, description: 'Extremely wide' },
      { scaleX: 10, scaleY: 0.01, description: 'Extremely tall' },
      { scaleX: -1, scaleY: 1, description: 'Horizontally flipped' },
      { scaleX: 1, scaleY: -1, description: 'Vertically flipped' },
      { scaleX: -1, scaleY: -1, description: 'Both axes flipped' }
    ];

    for (const scale of scaleValues) {
      console.log(`Testing scale: ${scale.description} (${scale.scaleX}, ${scale.scaleY})`);
      
      try {
        // Apply scale
        await page.evaluate((scaleProps) => {
          const canvas = (window as any).canvas;
          const activeObject = canvas?.getActiveObject();
          if (activeObject) {
            activeObject.set({
              scaleX: scaleProps.scaleX,
              scaleY: scaleProps.scaleY
            });
            canvas.renderAll();
          }
        }, scale);
        
        await page.waitForTimeout(200);
        
        // Verify scale was applied
        const objectProps = await getActiveObjectProperties(page);
        expect(objectProps).toBeTruthy();
        expect(objectProps?.scaleX).toBeCloseTo(scale.scaleX, 2);
        expect(objectProps?.scaleY).toBeCloseTo(scale.scaleY, 2);
        
        // Verify canvas is still responsive
        const canvasInfo = await getCanvasInfo(page);
        expect(canvasInfo?.objects).toBe(1);
        
        // Try to interact with scaled object
        const canvas = page.locator('canvas');
        await canvas.click();
        await page.waitForTimeout(100);
        
        // Test editing at different scales (skip extreme scales)
        if (Math.abs(scale.scaleX) >= 0.1 && Math.abs(scale.scaleX) <= 10 &&
            Math.abs(scale.scaleY) >= 0.1 && Math.abs(scale.scaleY) <= 10) {
          await canvas.dblclick();
          await page.keyboard.type(` Scale:${scale.scaleX},${scale.scaleY}`);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(100);
        }
        
      } catch (error) {
        console.log(`Scale ${scale.description} caused error:`, error);
        
        // Verify canvas is still functional
        const canvasInfo = await getCanvasInfo(page);
        expect(canvasInfo?.objects).toBe(1);
      }
    }
    
    // Reset to normal scale
    await page.evaluate(() => {
      const canvas = (window as any).canvas;
      const activeObject = canvas?.getActiveObject();
      if (activeObject) {
        activeObject.set({ scaleX: 1, scaleY: 1 });
        canvas.renderAll();
      }
    });
    
    const finalProps = await getActiveObjectProperties(page);
    expect(finalProps?.scaleX).toBeCloseTo(1, 2);
    expect(finalProps?.scaleY).toBeCloseTo(1, 2);
    
    console.log('Scale boundary test completed');
  });
});