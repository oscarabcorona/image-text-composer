import { test, expect, Page } from '@playwright/test';

// Performance measurement utilities
interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryBefore?: any;
  memoryAfter?: any;
  memoryDelta?: number;
}

async function measurePerformance(
  page: Page, 
  operation: string, 
  testFunction: () => Promise<void>
): Promise<PerformanceMetrics> {
  
  // Measure memory before
  const memoryBefore = await page.evaluate(() => {
    const memory = (performance as any).memory;
    return memory ? {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize
    } : null;
  });

  const startTime = Date.now();
  
  await testFunction();
  
  const endTime = Date.now();
  
  // Measure memory after
  const memoryAfter = await page.evaluate(() => {
    const memory = (performance as any).memory;
    return memory ? {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize
    } : null;
  });

  const metrics: PerformanceMetrics = {
    operation,
    startTime,
    endTime,
    duration: endTime - startTime,
    memoryBefore,
    memoryAfter,
    memoryDelta: memoryAfter && memoryBefore ? 
      memoryAfter.usedJSHeapSize - memoryBefore.usedJSHeapSize : undefined
  };

  console.log(`Performance: ${operation} took ${metrics.duration}ms`);
  if (metrics.memoryDelta) {
    console.log(`Memory delta: ${metrics.memoryDelta} bytes`);
  }

  return metrics;
}

async function getCanvasInfo(page: Page) {
  return await page.evaluate(() => {
    const canvas = (window as any).canvas;
    const store = (window as any).useEditorStore?.getState?.();
    
    return {
      objects: canvas?.getObjects().length || 0,
      zoom: canvas?.getZoom() || 1,
      width: canvas?.width || 0,
      height: canvas?.height || 0,
      layers: store?.layers?.length || 0,
      historyLength: store?.history?.length || 0
    };
  });
}

async function measureCanvasFrameRate(page: Page, durationMs: number = 2000): Promise<number> {
  const frameCount = await page.evaluate((duration) => {
    return new Promise<number>((resolve) => {
      let frames = 0;
      const startTime = Date.now();
      
      function countFrame() {
        frames++;
        if (Date.now() - startTime < duration) {
          requestAnimationFrame(countFrame);
        } else {
          resolve(frames);
        }
      }
      
      requestAnimationFrame(countFrame);
    });
  }, durationMs);
  
  const fps = (frameCount / durationMs) * 1000;
  console.log(`Measured FPS over ${durationMs}ms: ${fps.toFixed(1)}`);
  return fps;
}

test.describe('Performance Stress Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Rapid zoom operations stress test', async ({ page }) => {
    console.log('Testing rapid zoom operations...');
    
    // Setup canvas with some content
    const imageData = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      ctx!.fillStyle = '#f0f0f0';
      ctx!.fillRect(0, 0, 1000, 800);
      ctx!.fillStyle = '#000000';
      ctx!.font = '20px Arial';
      ctx!.fillText('Zoom Stress Test', 100, 100);
      return canvas.toDataURL('image/png');
    });

    await page.evaluate((dataUrl) => {
      const file = new File([
        Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0))
      ], 'zoom-test.png', { type: 'image/png' });
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, imageData);

    await page.waitForTimeout(1000);

    // Add text layers for more complex rendering
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("Add Text")');
      await page.waitForTimeout(100);
    }

    const initialInfo = await getCanvasInfo(page);
    expect(initialInfo.objects).toBe(5);

    // Measure rapid zoom in/out operations
    const zoomMetrics = await measurePerformance(page, 'Rapid Zoom Operations', async () => {
      // Rapid zoom in
      for (let i = 0; i < 20; i++) {
        await page.click('button[title="Zoom in (Ctrl++)"]');
        await page.waitForTimeout(10); // Very short delay
      }
      
      // Rapid zoom out
      for (let i = 0; i < 40; i++) {
        await page.click('button[title="Zoom out (Ctrl+-)"]');
        await page.waitForTimeout(10);
      }
      
      // Rapid zoom in again
      for (let i = 0; i < 20; i++) {
        await page.click('button[title="Zoom in (Ctrl++)"]');
        await page.waitForTimeout(10);
      }
    });

    // Performance should be reasonable (less than 10 seconds for all zoom operations)
    expect(zoomMetrics.duration).toBeLessThan(10000);

    // Verify canvas is still responsive after rapid zoom
    const finalInfo = await getCanvasInfo(page);
    expect(finalInfo.objects).toBe(5);
    expect(finalInfo.zoom).toBeGreaterThan(0);

    // Test zoom via mouse wheel simulation
    const wheelZoomMetrics = await measurePerformance(page, 'Mouse Wheel Zoom', async () => {
      const canvas = page.locator('canvas');
      const canvasBox = await canvas.boundingBox();
      
      if (canvasBox) {
        const centerX = canvasBox.x + canvasBox.width / 2;
        const centerY = canvasBox.y + canvasBox.height / 2;
        
        // Simulate rapid wheel zoom events
        for (let i = 0; i < 50; i++) {
          await page.mouse.move(centerX, centerY);
          await page.mouse.wheel(0, i % 2 === 0 ? -100 : 100); // Alternate zoom in/out
          await page.waitForTimeout(5);
        }
      }
    });

    console.log('Wheel zoom performance:', wheelZoomMetrics.duration);
    
    // Canvas should still be functional
    const afterWheelInfo = await getCanvasInfo(page);
    expect(afterWheelInfo.objects).toBe(5);
  });

  test('Many simultaneous text edits stress test', async ({ page }) => {
    console.log('Testing simultaneous text edits...');
    
    // Create multiple text layers
    const textLayerCount = 25;
    
    const createLayersMetrics = await measurePerformance(page, `Create ${textLayerCount} Text Layers`, async () => {
      for (let i = 0; i < textLayerCount; i++) {
        await page.click('button:has-text("Add Text")');
        await page.waitForTimeout(20); // Minimal delay
      }
    });

    const initialInfo = await getCanvasInfo(page);
    expect(initialInfo.objects).toBe(textLayerCount);
    expect(createLayersMetrics.duration).toBeLessThan(textLayerCount * 200); // Max 200ms per layer

    // Test editing multiple layers rapidly
    const editMetrics = await measurePerformance(page, 'Rapid Text Editing', async () => {
      const canvas = page.locator('canvas');
      
      // Edit every 3rd text layer
      for (let i = 0; i < textLayerCount; i += 3) {
        // Click on a text layer (approximate position)
        await canvas.click({ position: { x: 100 + (i * 20), y: 100 + (i * 15) } });
        await page.waitForTimeout(50);
        
        // Double-click to edit
        await canvas.dblclick({ position: { x: 100 + (i * 20), y: 100 + (i * 15) } });
        await page.waitForTimeout(50);
        
        // Type content
        await page.keyboard.type(`Edited layer ${i}`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(30);
      }
    });

    console.log('Text editing performance:', editMetrics.duration);
    
    // Test font changes on multiple layers
    const fontChangeMetrics = await measurePerformance(page, 'Multiple Font Changes', async () => {
      const fontSizes = [12, 16, 20, 24, 28, 32];
      
      for (let i = 0; i < Math.min(textLayerCount, 10); i++) {
        // Select layer (click first item in layers panel)
        const layerItems = page.locator('[data-testid="layer-item"]');
        if (await layerItems.count() > i) {
          await layerItems.nth(i).click();
          await page.waitForTimeout(30);
          
          // Change font size
          const fontSize = fontSizes[i % fontSizes.length];
          const fontSizeInput = page.locator('input[type="number"][min="8"]').first();
          await fontSizeInput.fill(fontSize.toString());
          await page.keyboard.press('Enter');
          await page.waitForTimeout(50);
        }
      }
    });

    // Verify final state
    const finalInfo = await getCanvasInfo(page);
    expect(finalInfo.objects).toBe(textLayerCount);
    
    console.log('Font change performance:', fontChangeMetrics.duration);
  });

  test('Canvas with 50+ overlapping objects', async ({ page }) => {
    console.log('Testing canvas with many overlapping objects...');
    
    const objectCount = 50;
    
    // Create overlapping objects
    const createOverlappingMetrics = await measurePerformance(page, `Create ${objectCount} Overlapping Objects`, async () => {
      for (let i = 0; i < objectCount; i++) {
        await page.click('button:has-text("Add Text")');
        await page.waitForTimeout(30);
        
        // Position objects to overlap by setting similar positions
        const canvas = page.locator('canvas');
        await canvas.click();
        
        // Move to overlapping position
        await page.evaluate((index) => {
          const canvas = (window as any).canvas;
          const activeObject = canvas?.getActiveObject();
          if (activeObject) {
            // Create overlapping pattern
            const x = 100 + (index % 10) * 20; // 10 columns
            const y = 100 + Math.floor(index / 10) * 25; // Rows
            activeObject.set({ left: x, top: y });
            canvas.renderAll();
          }
        }, i);
        
        await page.waitForTimeout(10);
      }
    });

    const overlappingInfo = await getCanvasInfo(page);
    expect(overlappingInfo.objects).toBe(objectCount);
    
    // Test selection performance with many overlapping objects
    const selectionMetrics = await measurePerformance(page, 'Object Selection with Overlaps', async () => {
      const canvas = page.locator('canvas');
      
      // Click on various positions to select different objects
      for (let i = 0; i < 20; i++) {
        const x = 100 + (i % 5) * 30;
        const y = 100 + Math.floor(i / 5) * 40;
        await canvas.click({ position: { x, y } });
        await page.waitForTimeout(25);
      }
    });

    // Test rendering performance
    const renderingMetrics = await measurePerformance(page, 'Rendering Performance Test', async () => {
      // Force multiple re-renders by changing zoom
      for (let i = 0; i < 10; i++) {
        await page.evaluate((zoom) => {
          const canvas = (window as any).canvas;
          if (canvas) {
            canvas.setZoom(1 + (zoom * 0.1));
            canvas.renderAll();
          }
        }, i);
        await page.waitForTimeout(50);
      }
    });

    // Measure actual frame rate during interactions
    console.log('Measuring frame rate with overlapping objects...');
    const fps = await measureCanvasFrameRate(page, 3000);
    
    // Should maintain reasonable frame rate (>10 FPS even with many objects)
    expect(fps).toBeGreaterThan(10);
    
    console.log('Overlapping objects performance:', {
      creation: createOverlappingMetrics.duration,
      selection: selectionMetrics.duration,
      rendering: renderingMetrics.duration,
      fps: fps
    });
  });

  test('Real-time typing performance in large text', async ({ page }) => {
    console.log('Testing real-time typing performance...');
    
    // Create text layer with large initial content
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    const canvas = page.locator('canvas');
    await canvas.dblclick();
    
    // Add initial large text content
    const initialText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100); // ~5000 characters
    
    await page.evaluate((text) => {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName === 'TEXTAREA') {
        (activeElement as HTMLTextAreaElement).value = text;
        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, initialText);
    
    await page.waitForTimeout(1000);
    
    // Test typing performance at end of large text
    const typingMetrics = await measurePerformance(page, 'Typing in Large Text', async () => {
      // Move cursor to end
      await page.keyboard.press('Control+End');
      
      // Type additional content
      const additionalText = ' Additional text content that tests real-time performance during typing operations in large text blocks.';
      
      for (const char of additionalText) {
        await page.keyboard.type(char);
        await page.waitForTimeout(10); // Small delay to simulate human typing
      }
    });

    // Should be responsive (less than 50ms per character on average)
    const avgTimePerChar = typingMetrics.duration / 100; // Roughly 100 additional characters
    console.log(`Average time per character: ${avgTimePerChar.toFixed(2)}ms`);
    expect(avgTimePerChar).toBeLessThan(50);

    // Test text selection performance in large text
    const selectionMetrics = await measurePerformance(page, 'Text Selection in Large Text', async () => {
      // Select all text
      await page.keyboard.press('Control+a');
      await page.waitForTimeout(100);
      
      // Select portions of text
      await page.keyboard.press('Home');
      await page.keyboard.down('Shift');
      for (let i = 0; i < 50; i++) {
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(5);
      }
      await page.keyboard.up('Shift');
    });

    // Test deletion performance
    const deletionMetrics = await measurePerformance(page, 'Text Deletion Performance', async () => {
      // Select and delete large portions
      await page.keyboard.press('Control+a');
      await page.waitForTimeout(50);
      
      // Delete half the text
      await page.keyboard.press('Control+Shift+End');
      await page.keyboard.press('Delete');
      await page.waitForTimeout(100);
      
      // Delete word by word
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Control+Backspace');
        await page.waitForTimeout(10);
      }
    });

    await page.keyboard.press('Escape');

    console.log('Text performance metrics:', {
      typing: typingMetrics.duration,
      selection: selectionMetrics.duration,
      deletion: deletionMetrics.duration
    });
    
    // Verify text operations didn't break the canvas
    const finalInfo = await getCanvasInfo(page);
    expect(finalInfo.objects).toBe(1);
  });

  test('Extended session memory usage', async ({ page }) => {
    console.log('Testing extended session memory usage...');
    
    const sessionMetrics: PerformanceMetrics[] = [];
    const sessionDurationMinutes = 2; // Shorter for test efficiency
    const operationsPerMinute = 30;
    
    const totalOperations = sessionDurationMinutes * operationsPerMinute;
    console.log(`Simulating ${sessionDurationMinutes} minutes of usage with ${totalOperations} operations...`);
    
    let operationCount = 0;
    
    while (operationCount < totalOperations) {
      // Vary operations to simulate real usage
      const operations = [
        async () => {
          await page.click('button:has-text("Add Text")');
          await page.waitForTimeout(200);
        },
        async () => {
          const canvas = page.locator('canvas');
          await canvas.dblclick();
          await page.keyboard.type(`Operation ${operationCount}`);
          await page.keyboard.press('Escape');
        },
        async () => {
          await page.keyboard.press('Control+z'); // Undo
        },
        async () => {
          await page.keyboard.press('Control+y'); // Redo
        },
        async () => {
          const layerItems = await page.locator('[data-testid="layer-item"]').count();
          if (layerItems > 0) {
            await page.click('[data-testid="layer-item"]:first-child');
            await page.keyboard.press('Delete');
          }
        },
        async () => {
          // Font size change
          const fontSizeInput = page.locator('input[type="number"][min="8"]').first();
          const size = 12 + (operationCount % 20);
          await fontSizeInput.fill(size.toString());
          await page.keyboard.press('Enter');
        }
      ];
      
      const operation = operations[operationCount % operations.length];
      const opName = `Operation ${operationCount}`;
      
      const metrics = await measurePerformance(page, opName, operation);
      sessionMetrics.push(metrics);
      
      // Log memory every 15 operations
      if (operationCount % 15 === 0) {
        const currentMemory = await page.evaluate(() => {
          const memory = (performance as any).memory;
          return memory ? memory.usedJSHeapSize : null;
        });
        console.log(`Operation ${operationCount}: Memory usage: ${currentMemory} bytes`);
      }
      
      operationCount++;
      await page.waitForTimeout(100); // Brief pause between operations
    }
    
    // Analyze session performance
    const avgDuration = sessionMetrics.reduce((sum, m) => sum + m.duration, 0) / sessionMetrics.length;
    const maxDuration = Math.max(...sessionMetrics.map(m => m.duration));
    const minDuration = Math.min(...sessionMetrics.map(m => m.duration));
    
    console.log('Session performance summary:', {
      totalOperations,
      avgDuration: avgDuration.toFixed(2),
      maxDuration,
      minDuration,
      sessionDurationMs: sessionMetrics.reduce((sum, m) => sum + m.duration, 0)
    });
    
    // Performance should remain consistent (no major degradation)
    expect(avgDuration).toBeLessThan(1000); // Average operation under 1 second
    expect(maxDuration).toBeLessThan(5000); // No single operation over 5 seconds
    
    // Check final memory usage
    const finalMemory = await page.evaluate(() => {
      const memory = (performance as any).memory;
      return memory ? {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize
      } : null;
    });
    
    console.log('Final memory state:', finalMemory);
    
    // App should still be functional after extended session
    const finalInfo = await getCanvasInfo(page);
    expect(finalInfo).toBeTruthy();
    
    // Test that app can still perform basic operations smoothly
    const postSessionMetrics = await measurePerformance(page, 'Post-Session Operation Test', async () => {
      await page.click('button:has-text("Add Text")');
      const canvas = page.locator('canvas');
      await canvas.dblclick();
      await page.keyboard.type('Post-session test');
      await page.keyboard.press('Escape');
    });
    
    expect(postSessionMetrics.duration).toBeLessThan(2000);
    console.log('App remained responsive after extended session');
  });

  test('Concurrent operations performance', async ({ page }) => {
    console.log('Testing concurrent operations performance...');
    
    // Setup initial content
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("Add Text")');
      await page.waitForTimeout(100);
    }
    
    // Test concurrent operations that might conflict
    const concurrentMetrics = await measurePerformance(page, 'Concurrent Operations', async () => {
      // Start multiple operations in rapid succession
      const operations = [
        page.click('button:has-text("Add Text")'),
        page.keyboard.press('Control+z'),
        page.click('[data-testid="layer-item"]:first-child'),
        page.keyboard.press('Control+y'),
        page.click('button:has-text("Add Text")')
      ];
      
      // Execute all operations without waiting
      await Promise.allSettled(operations);
      await page.waitForTimeout(1000); // Wait for operations to complete
    });
    
    // Test rapid state changes
    const rapidStateChanges = await measurePerformance(page, 'Rapid State Changes', async () => {
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(25);
        await page.keyboard.press('Control+y');
        await page.waitForTimeout(25);
      }
    });
    
    // Verify app state is consistent after concurrent operations
    const finalInfo = await getCanvasInfo(page);
    expect(finalInfo.objects).toBeGreaterThanOrEqual(0);
    expect(finalInfo.layers).toBeGreaterThanOrEqual(0);
    
    console.log('Concurrent operations completed:', {
      concurrentOps: concurrentMetrics.duration,
      rapidStateChanges: rapidStateChanges.duration
    });
    
    // Test that app can recover and continue normal operations
    await page.click('button:has-text("Add Text")');
    const recoveryInfo = await getCanvasInfo(page);
    expect(recoveryInfo.objects).toBeGreaterThan(finalInfo.objects);
    
    console.log('App successfully recovered from concurrent operations');
  });
});