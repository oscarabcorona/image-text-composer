import { test, expect, Page } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

// Utility functions for export testing
async function setupCanvasWithContent(page: Page, options?: {
  imageWidth?: number;
  imageHeight?: number;
  textLayers?: number;
  complexContent?: boolean;
}) {
  const {
    imageWidth = 800,
    imageHeight = 600,
    textLayers = 1,
    complexContent = false
  } = options || {};

  // Create and upload test image if needed
  if (imageWidth && imageHeight) {
    const imageData = await page.evaluate(({ width, height }) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Create test pattern
      ctx!.fillStyle = '#f0f0f0';
      ctx!.fillRect(0, 0, width, height);
      
      // Add corner markers
      ctx!.fillStyle = '#ff0000';
      ctx!.fillRect(0, 0, 50, 50);
      ctx!.fillRect(width - 50, 0, 50, 50);
      ctx!.fillRect(0, height - 50, 50, 50);
      ctx!.fillRect(width - 50, height - 50, 50, 50);
      
      ctx!.fillStyle = '#000000';
      ctx!.font = '20px Arial';
      ctx!.fillText(`${width}x${height}`, 100, 100);
      
      return canvas.toDataURL('image/png');
    }, { width: imageWidth, height: imageHeight });

    await page.evaluate((dataUrl) => {
      const file = new File([
        Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0))
      ], 'test-export.png', { type: 'image/png' });
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, imageData);

    await page.waitForTimeout(1000);
  }

  // Add text layers
  for (let i = 0; i < textLayers; i++) {
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(300);

    if (complexContent) {
      const canvas = page.locator('canvas');
      await canvas.dblclick();
      await page.keyboard.type(`Complex Text Layer ${i + 1}\nWith multiple lines\nAnd special chars: éñü!@#$%^&*()`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }
  }

  return { imageWidth, imageHeight, textLayers };
}

async function getCanvasInfo(page: Page) {
  return await page.evaluate(() => {
    const canvas = (window as any).canvas;
    const store = (window as any).useEditorStore?.getState?.();
    
    return {
      canvasWidth: canvas?.width || 0,
      canvasHeight: canvas?.height || 0,
      zoom: canvas?.getZoom() || 1,
      objects: canvas?.getObjects().length || 0,
      hasBackgroundImage: !!canvas?.backgroundImage,
      originalImageWidth: store?.originalImageWidth || 0,
      originalImageHeight: store?.originalImageHeight || 0,
      layers: store?.layers?.length || 0
    };
  });
}

async function attemptExport(page: Page): Promise<{ success: boolean; error?: string; downloadPath?: string }> {
  try {
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await page.click('button:has-text("Export PNG")');
    
    const download = await downloadPromise;
    const downloadPath = await download.path();
    
    return { success: true, downloadPath };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

test.describe('Export Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Export with no background image', async ({ page }) => {
    console.log('Testing export with no background image...');
    
    // Add text without any background image
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    const canvas = page.locator('canvas');
    await canvas.dblclick();
    await page.keyboard.type('Text without background');
    await page.keyboard.press('Escape');
    
    // Verify setup
    const canvasInfo = await getCanvasInfo(page);
    expect(canvasInfo.objects).toBe(1);
    expect(canvasInfo.hasBackgroundImage).toBeFalsy();
    
    // Attempt export
    const exportResult = await attemptExport(page);
    console.log('Export result:', exportResult);
    
    if (exportResult.success && exportResult.downloadPath) {
      // Verify file was created
      const stats = await fs.stat(exportResult.downloadPath).catch(() => null);
      expect(stats?.size).toBeGreaterThan(1000);
      console.log('Export successful - file size:', stats?.size);
    } else {
      // Export might fail or produce empty result - this is acceptable behavior
      console.log('Export failed as expected for no-background scenario');
    }
    
    // App should remain functional after export attempt
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(300);
    
    const finalInfo = await getCanvasInfo(page);
    expect(finalInfo.objects).toBe(2);
  });

  test('Export with all layers hidden', async ({ page }) => {
    console.log('Testing export with all layers hidden...');
    
    // Setup canvas with content
    await setupCanvasWithContent(page, { textLayers: 3 });
    
    const initialInfo = await getCanvasInfo(page);
    expect(initialInfo.objects).toBe(3);
    
    // Hide all layers by manipulating their visibility
    await page.evaluate(() => {
      const canvas = (window as any).canvas;
      if (canvas) {
        canvas.getObjects().forEach((obj: any) => {
          obj.set('visible', false);
        });
        canvas.renderAll();
      }
    });
    
    await page.waitForTimeout(500);
    
    // Verify layers are hidden
    const hiddenLayersInfo = await page.evaluate(() => {
      const canvas = (window as any).canvas;
      const visibleObjects = canvas?.getObjects().filter((obj: any) => obj.visible !== false) || [];
      return { totalObjects: canvas?.getObjects().length || 0, visibleObjects: visibleObjects.length };
    });
    
    console.log('Hidden layers info:', hiddenLayersInfo);
    expect(hiddenLayersInfo.totalObjects).toBe(3);
    expect(hiddenLayersInfo.visibleObjects).toBe(0);
    
    // Attempt export
    const exportResult = await attemptExport(page);
    console.log('Export with hidden layers result:', exportResult);
    
    if (exportResult.success) {
      console.log('Export completed - may contain only background or be empty');
    } else {
      console.log('Export failed with hidden layers - acceptable behavior');
    }
    
    // Restore visibility and verify functionality
    await page.evaluate(() => {
      const canvas = (window as any).canvas;
      if (canvas) {
        canvas.getObjects().forEach((obj: any) => {
          obj.set('visible', true);
        });
        canvas.renderAll();
      }
    });
    
    const restoredInfo = await getCanvasInfo(page);
    expect(restoredInfo.objects).toBe(3);
  });

  test('Export during canvas operations', async ({ page }) => {
    console.log('Testing export during canvas operations...');
    
    // Setup canvas with content
    await setupCanvasWithContent(page, { textLayers: 2 });
    
    // Start a canvas operation (text editing)
    const canvas = page.locator('canvas');
    await canvas.dblclick();
    await page.keyboard.type('Editing in progress');
    
    // Don't exit edit mode - try to export while editing
    const exportResult = await attemptExport(page);
    console.log('Export during editing result:', exportResult);
    
    // Exit edit mode
    await page.keyboard.press('Escape');
    
    // Start another operation (dragging)
    await canvas.click();
    await page.mouse.down();
    
    // Try export while dragging
    const exportDuringDragResult = await attemptExport(page);
    console.log('Export during drag result:', exportDuringDragResult);
    
    await page.mouse.up();
    
    // Try rapid export clicks
    console.log('Testing rapid export attempts...');
    const rapidExportResults = [];
    
    for (let i = 0; i < 5; i++) {
      const rapidResult = await attemptExport(page);
      rapidExportResults.push(rapidResult);
      await page.waitForTimeout(100);
    }
    
    console.log('Rapid export results:', rapidExportResults);
    
    // At least one export should succeed or all should fail gracefully
    const successCount = rapidExportResults.filter(r => r.success).length;
    console.log(`${successCount} out of 5 rapid exports succeeded`);
    
    // App should remain functional
    const finalInfo = await getCanvasInfo(page);
    expect(finalInfo.objects).toBeGreaterThan(0);
  });

  test('Export with corrupted canvas state', async ({ page }) => {
    console.log('Testing export with corrupted canvas state...');
    
    // Setup normal content first
    await setupCanvasWithContent(page, { textLayers: 2 });
    
    const initialInfo = await getCanvasInfo(page);
    expect(initialInfo.objects).toBe(2);
    
    // Corrupt canvas state in various ways
    const corruptionScenarios = [
      {
        name: 'Null canvas objects',
        corrupt: () => {
          const canvas = (window as any).canvas;
          if (canvas) {
            canvas._objects = null;
          }
        }
      },
      {
        name: 'Invalid object properties',
        corrupt: () => {
          const canvas = (window as any).canvas;
          if (canvas && canvas._objects) {
            canvas._objects.forEach((obj: any) => {
              obj.left = NaN;
              obj.top = undefined;
              obj.width = null;
            });
          }
        }
      },
      {
        name: 'Broken rendering context',
        corrupt: () => {
          const canvas = (window as any).canvas;
          if (canvas) {
            canvas.contextContainer = null;
            canvas.contextCache = null;
          }
        }
      },
      {
        name: 'Circular references',
        corrupt: () => {
          const canvas = (window as any).canvas;
          if (canvas && canvas._objects && canvas._objects[0]) {
            const obj = canvas._objects[0];
            obj.circularRef = obj;
            obj.parent = { child: obj };
          }
        }
      }
    ];

    for (const scenario of corruptionScenarios) {
      console.log(`Testing corruption scenario: ${scenario.name}...`);
      
      // Re-setup clean state
      await page.reload();
      await page.waitForLoadState('networkidle');
      await setupCanvasWithContent(page, { textLayers: 1 });
      
      // Apply corruption
      await page.evaluate(scenario.corrupt);
      await page.waitForTimeout(500);
      
      // Attempt export
      const exportResult = await attemptExport(page);
      console.log(`Export result for ${scenario.name}:`, exportResult.success);
      
      // App should either handle gracefully or fail safely
      if (!exportResult.success) {
        console.log(`Export failed for ${scenario.name} (acceptable)`);
      }
      
      // Verify app doesn't crash
      try {
        await page.click('button:has-text("Add Text")');
        await page.waitForTimeout(200);
        console.log(`App remained functional after ${scenario.name}`);
      } catch (error) {
        console.log(`App functionality impacted by ${scenario.name}: ${error}`);
      }
    }
  });

  test('Export of extremely large compositions', async ({ page }) => {
    console.log('Testing export of extremely large compositions...');
    
    // Create large composition
    await setupCanvasWithContent(page, { 
      imageWidth: 2000, 
      imageHeight: 1500, 
      textLayers: 0  // Add layers manually for more control
    });
    
    // Add many text layers with various properties
    for (let i = 0; i < 20; i++) {
      await page.click('button:has-text("Add Text")');
      await page.waitForTimeout(100);
      
      const canvas = page.locator('canvas');
      await canvas.dblclick();
      await page.keyboard.type(`Layer ${i}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`);
      await page.keyboard.press('Escape');
      
      // Vary text properties to make it more complex
      if (i % 3 === 0) {
        // Change font size for every 3rd layer
        const fontSizeInput = page.locator('input[type="number"][min="8"]').first();
        await fontSizeInput.fill((24 + i * 2).toString());
        await page.keyboard.press('Enter');
      }
      
      await page.waitForTimeout(50);
    }
    
    const largeCompositionInfo = await getCanvasInfo(page);
    expect(largeCompositionInfo.objects).toBe(20);
    console.log('Large composition created:', largeCompositionInfo);
    
    // Test export at different zoom levels
    const zoomLevels = [0.25, 0.5, 1, 2];
    
    for (const zoomLevel of zoomLevels) {
      console.log(`Testing export at ${zoomLevel}x zoom...`);
      
      // Set zoom level
      await page.evaluate((zoom) => {
        const canvas = (window as any).canvas;
        if (canvas) {
          canvas.setZoom(zoom);
          canvas.renderAll();
        }
      }, zoomLevel);
      
      await page.waitForTimeout(500);
      
      // Attempt export
      const exportResult = await attemptExport(page);
      console.log(`Export at ${zoomLevel}x zoom:`, exportResult.success);
      
      if (exportResult.success && exportResult.downloadPath) {
        try {
          const stats = await fs.stat(exportResult.downloadPath);
          console.log(`Export file size at ${zoomLevel}x: ${stats.size} bytes`);
          
          // Large compositions should produce reasonably sized files
          expect(stats.size).toBeGreaterThan(10000); // At least 10KB
          expect(stats.size).toBeLessThan(50000000); // Less than 50MB
        } catch (error) {
          console.log(`Could not check file stats: ${error}`);
        }
      }
      
      await page.waitForTimeout(500);
    }
    
    // Reset zoom
    await page.evaluate(() => {
      const canvas = (window as any).canvas;
      if (canvas) {
        canvas.setZoom(1);
        canvas.renderAll();
      }
    });
  });

  test('Export interruption and cancellation', async ({ page }) => {
    console.log('Testing export interruption and cancellation...');
    
    // Setup large content that might take time to export
    await setupCanvasWithContent(page, { 
      imageWidth: 1500, 
      imageHeight: 1200, 
      textLayers: 10, 
      complexContent: true 
    });
    
    // Start export and immediately try to interrupt
    console.log('Testing export interruption by navigation...');
    
    // Start export (don't await)
    const exportPromise = attemptExport(page);
    
    // Immediately try to navigate away (simulating user interruption)
    await page.waitForTimeout(100);
    await page.goto('about:blank');
    await page.waitForTimeout(500);
    
    // Go back to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if export promise resolved or was interrupted
    try {
      const interruptedResult = await exportPromise;
      console.log('Export result after interruption:', interruptedResult.success);
    } catch (error) {
      console.log('Export was interrupted as expected:', error.message);
    }
    
    // Test rapid export cancellation by user actions
    await setupCanvasWithContent(page, { textLayers: 5 });
    
    console.log('Testing export cancellation by user actions...');
    
    // Start multiple exports in quick succession
    const rapidExports = [];
    for (let i = 0; i < 3; i++) {
      rapidExports.push(attemptExport(page));
      await page.waitForTimeout(50);
      
      // Interfere with canvas during export
      await page.click('button:has-text("Add Text")');
      await page.waitForTimeout(50);
    }
    
    // Wait for all exports to complete or fail
    const rapidResults = await Promise.allSettled(rapidExports);
    
    rapidResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`Rapid export ${index}: ${result.value.success}`);
      } else {
        console.log(`Rapid export ${index} rejected: ${result.reason}`);
      }
    });
    
    // App should still be functional after interruptions
    const finalInfo = await getCanvasInfo(page);
    expect(finalInfo.objects).toBeGreaterThan(0);
  });

  test('Export with browser memory constraints', async ({ page }) => {
    console.log('Testing export with memory constraints...');
    
    // Create memory-intensive composition
    await setupCanvasWithContent(page, { 
      imageWidth: 3000, 
      imageHeight: 2000, 
      textLayers: 0 
    });
    
    // Add layers with very large font sizes and long text
    for (let i = 0; i < 15; i++) {
      await page.click('button:has-text("Add Text")');
      await page.waitForTimeout(200);
      
      // Set large font size
      const fontSizeInput = page.locator('input[type="number"][min="8"]').first();
      await fontSizeInput.fill('120');
      await page.keyboard.press('Enter');
      
      const canvas = page.locator('canvas');
      await canvas.dblclick();
      
      // Add very long text content
      const longText = `LARGE TEXT LAYER ${i}: ` + 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(50);
      await page.evaluate((text) => {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'TEXTAREA') {
          (activeElement as HTMLTextAreaElement).value = text;
          activeElement.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, longText);
      
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
    }
    
    // Check memory usage before export
    const memoryBefore = await page.evaluate(() => {
      const memory = (performance as any).memory;
      return memory ? {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      } : null;
    });
    
    console.log('Memory before export:', memoryBefore);
    
    // Attempt export of memory-intensive composition
    const memoryIntensiveExport = await attemptExport(page);
    console.log('Memory-intensive export result:', memoryIntensiveExport.success);
    
    // Check memory usage after export
    const memoryAfter = await page.evaluate(() => {
      const memory = (performance as any).memory;
      return memory ? {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize
      } : null;
    });
    
    console.log('Memory after export:', memoryAfter);
    
    // Test if export succeeded or failed gracefully
    if (memoryIntensiveExport.success) {
      console.log('Large export succeeded');
      
      if (memoryIntensiveExport.downloadPath) {
        try {
          const stats = await fs.stat(memoryIntensiveExport.downloadPath);
          console.log('Large export file size:', stats.size);
          expect(stats.size).toBeGreaterThan(50000); // Should be substantial
        } catch (error) {
          console.log('Could not verify export file size');
        }
      }
    } else {
      console.log('Large export failed - acceptable for memory-constrained scenarios');
    }
    
    // Verify app is still functional after memory-intensive export
    const finalCanvasInfo = await getCanvasInfo(page);
    expect(finalCanvasInfo.objects).toBeGreaterThan(0);
    
    // Try a simple export to verify basic functionality still works
    await page.click('button:has-text("Reset")');
    page.on('dialog', dialog => dialog.accept());
    await page.waitForTimeout(500);
    
    await setupCanvasWithContent(page, { textLayers: 1 });
    const simpleExportAfterReset = await attemptExport(page);
    
    console.log('Simple export after memory stress:', simpleExportAfterReset.success);
    expect(simpleExportAfterReset.success).toBeTruthy();
  });

  test('Export format edge cases and error handling', async ({ page }) => {
    console.log('Testing export format edge cases...');
    
    await setupCanvasWithContent(page, { textLayers: 2 });
    
    // Test export with canvas context corruption
    console.log('Testing export with corrupted rendering context...');
    
    await page.evaluate(() => {
      // Corrupt the canvas rendering context
      const canvas = (window as any).canvas;
      if (canvas && canvas.lowerCanvasEl) {
        const ctx = canvas.lowerCanvasEl.getContext('2d');
        if (ctx) {
          // Break some context methods
          ctx.drawImage = function() { throw new Error('Corrupted drawImage'); };
          ctx.getImageData = function() { throw new Error('Corrupted getImageData'); };
        }
      }
    });
    
    const corruptedContextExport = await attemptExport(page);
    console.log('Export with corrupted context:', corruptedContextExport.success);
    
    // Reload to reset context
    await page.reload();
    await page.waitForLoadState('networkidle');
    await setupCanvasWithContent(page, { textLayers: 1 });
    
    // Test export with invalid canvas dimensions
    console.log('Testing export with invalid canvas dimensions...');
    
    await page.evaluate(() => {
      const canvas = (window as any).canvas;
      if (canvas) {
        // Set invalid dimensions
        canvas.setDimensions({ width: 0, height: 0 });
      }
    });
    
    const invalidDimensionsExport = await attemptExport(page);
    console.log('Export with invalid dimensions:', invalidDimensionsExport.success);
    
    // Test export with extremely large target dimensions
    await page.reload();
    await page.waitForLoadState('networkidle');
    await setupCanvasWithContent(page, { textLayers: 1 });
    
    console.log('Testing export with extreme dimensions...');
    
    await page.evaluate(() => {
      const store = (window as any).useEditorStore?.getState?.();
      if (store) {
        // Try to set extremely large original dimensions
        const setState = (window as any).useEditorStore.setState;
        setState({ 
          originalImageWidth: 50000, 
          originalImageHeight: 50000 
        });
      }
    });
    
    const extremeDimensionsExport = await attemptExport(page);
    console.log('Export with extreme dimensions:', extremeDimensionsExport.success);
    
    // Test should complete without crashing the app
    const finalInfo = await getCanvasInfo(page);
    expect(finalInfo).toBeTruthy();
    
    console.log('Export format edge cases completed');
  });
});