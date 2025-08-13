import { test, expect, Page } from '@playwright/test';

// Memory monitoring utilities
async function getMemoryUsage(page: Page) {
  return await page.evaluate(() => {
    const memory = (performance as any).memory;
    return memory ? {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit
    } : null;
  });
}

async function getCanvasObjectCount(page: Page) {
  return await page.evaluate(() => {
    const canvas = (window as any).canvas;
    return canvas ? canvas.getObjects().length : 0;
  });
}

async function forceGarbageCollection(page: Page) {
  if (process.env.NODE_ENV === 'test') {
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });
  }
}

test.describe('Memory Stress Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Memory leak detection with 100+ text layers', async ({ page }) => {
    const initialMemory = await getMemoryUsage(page);
    console.log('Initial memory usage:', initialMemory);

    // Add 100 text layers rapidly
    console.log('Adding 100 text layers...');
    for (let i = 0; i < 100; i++) {
      await page.click('button:has-text("Add Text")');
      
      // Add text content to make layers more memory-intensive
      if (i % 10 === 0) {
        const canvas = page.locator('canvas');
        await canvas.dblclick();
        await page.keyboard.type(`Layer ${i}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.`);
        await page.keyboard.press('Escape');
        
        // Check memory every 10 layers
        const currentMemory = await getMemoryUsage(page);
        const objectCount = await getCanvasObjectCount(page);
        console.log(`Layer ${i}: Objects: ${objectCount}, Memory: ${currentMemory?.usedJSHeapSize || 'unknown'}`);
      }
      
      // Small delay to prevent overwhelming the browser
      if (i % 20 === 0) {
        await page.waitForTimeout(100);
      }
    }

    const finalObjectCount = await getCanvasObjectCount(page);
    expect(finalObjectCount).toBe(100);

    // Test memory after operations
    const memoryAfterAdd = await getMemoryUsage(page);
    console.log('Memory after adding 100 layers:', memoryAfterAdd);

    // Delete all layers and check for memory leaks
    console.log('Deleting all layers...');
    for (let i = 0; i < 100; i++) {
      // Select and delete layer
      const layerItems = await page.locator('[data-testid="layer-item"]').count();
      if (layerItems > 0) {
        await page.click('[data-testid="layer-item"]:first-child');
        await page.keyboard.press('Delete');
      }
      
      if (i % 20 === 0) {
        await page.waitForTimeout(50);
        await forceGarbageCollection(page);
      }
    }

    // Wait for cleanup
    await page.waitForTimeout(1000);
    await forceGarbageCollection(page);

    const finalMemory = await getMemoryUsage(page);
    const finalObjectCountAfterDelete = await getCanvasObjectCount(page);
    
    console.log('Final memory usage:', finalMemory);
    console.log('Final object count:', finalObjectCountAfterDelete);

    // Verify cleanup
    expect(finalObjectCountAfterDelete).toBe(0);
    
    // Memory should not be significantly higher than initial
    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;
      console.log(`Memory increase: ${memoryIncrease} bytes (${memoryIncreasePercent.toFixed(1)}%)`);
      
      // Allow for some memory increase but flag major leaks
      expect(memoryIncreasePercent).toBeLessThan(50);
    }
  });

  test('Canvas disposal during rapid operations', async ({ page }) => {
    console.log('Testing canvas disposal during rapid operations...');
    
    // Rapid add/remove cycles
    for (let cycle = 0; cycle < 10; cycle++) {
      // Add 5 layers rapidly
      for (let i = 0; i < 5; i++) {
        await page.click('button:has-text("Add Text")');
      }
      
      // Delete all layers rapidly
      for (let i = 0; i < 5; i++) {
        const layerCount = await page.locator('[data-testid="layer-item"]').count();
        if (layerCount > 0) {
          await page.click('[data-testid="layer-item"]:first-child');
          await page.keyboard.press('Delete');
        }
      }
      
      // Check for errors or crashes
      const objectCount = await getCanvasObjectCount(page);
      console.log(`Cycle ${cycle}: Objects remaining: ${objectCount}`);
    }

    // Verify no objects leaked
    const finalObjectCount = await getCanvasObjectCount(page);
    expect(finalObjectCount).toBe(0);

    // Verify canvas is still functional
    await page.click('button:has-text("Add Text")');
    const functionalTest = await getCanvasObjectCount(page);
    expect(functionalTest).toBe(1);
  });

  test('Large font size rendering stress test', async ({ page }) => {
    console.log('Testing large font size rendering...');
    
    // Upload a large test image to have something to render on
    const largeImageData = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      ctx!.fillStyle = '#f0f0f0';
      ctx!.fillRect(0, 0, 1000, 800);
      return canvas.toDataURL('image/png');
    });

    await page.evaluate((dataUrl) => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        const file = new File([
          Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0))
        ], 'large-test.png', { type: 'image/png' });
        
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, largeImageData);

    await page.waitForTimeout(1000);

    // Add text with extremely large font size
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Set very large font size
    const fontSizeInput = page.locator('input[type="number"][min="8"]').first();
    await fontSizeInput.fill('300');
    await page.keyboard.press('Enter');

    // Add long text content
    const canvas = page.locator('canvas');
    await canvas.dblclick();
    await page.keyboard.type('STRESS TEST WITH VERY LARGE FONT SIZE AND LONG TEXT CONTENT THAT MIGHT CAUSE RENDERING ISSUES');
    await page.keyboard.press('Escape');

    await page.waitForTimeout(1000);

    // Check if canvas is still responsive
    const objectCount = await getCanvasObjectCount(page);
    expect(objectCount).toBe(1);

    // Try to interact with the large text
    await canvas.click();
    await page.waitForTimeout(200);

    // Test rendering performance with multiple large text objects
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("Add Text")');
      await page.waitForTimeout(200);
      
      // Set large font for each
      const inputs = page.locator('input[type="number"][min="8"]');
      await inputs.nth(i + 1).fill('200');
      await page.keyboard.press('Enter');
    }

    const finalObjectCount = await getCanvasObjectCount(page);
    expect(finalObjectCount).toBe(6);

    // Verify canvas is still interactive
    await canvas.click();
    expect(await page.locator('canvas').isVisible()).toBeTruthy();
  });

  test('Browser tab backgrounding behavior', async ({ page }) => {
    console.log('Testing browser tab backgrounding behavior...');
    
    // Add some content
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Get initial state
    const initialObjectCount = await getCanvasObjectCount(page);
    const initialMemory = await getMemoryUsage(page);

    // Simulate tab being backgrounded
    await page.evaluate(() => {
      // Dispatch visibility change event
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.waitForTimeout(500);

    // Simulate tab being foregrounded
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.waitForTimeout(500);

    // Check that canvas state is preserved
    const afterObjectCount = await getCanvasObjectCount(page);
    expect(afterObjectCount).toBe(initialObjectCount);

    // Verify canvas is still interactive
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(200);
    
    const finalObjectCount = await getCanvasObjectCount(page);
    expect(finalObjectCount).toBe(initialObjectCount + 1);

    console.log('Tab backgrounding test passed - canvas state preserved');
  });

  test('Memory usage with extreme text content', async ({ page }) => {
    console.log('Testing memory usage with extreme text content...');
    
    // Generate very long text content
    const longText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(1000);
    
    const initialMemory = await getMemoryUsage(page);
    
    // Add text layer with extremely long content
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    const canvas = page.locator('canvas');
    await canvas.dblclick();
    
    // Type very long text (simulate paste)
    await page.evaluate((text) => {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName === 'TEXTAREA') {
        (activeElement as HTMLTextAreaElement).value = text;
        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, longText);
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    const afterLongTextMemory = await getMemoryUsage(page);
    console.log('Memory after long text:', afterLongTextMemory);

    // Verify text was added
    const objectCount = await getCanvasObjectCount(page);
    expect(objectCount).toBe(1);

    // Test editing the long text
    await canvas.dblclick();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('Replaced with short text');
    await page.keyboard.press('Escape');
    
    await page.waitForTimeout(500);
    await forceGarbageCollection(page);

    const finalMemory = await getMemoryUsage(page);
    console.log('Memory after text replacement:', finalMemory);

    // Memory should not grow excessively
    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;
      console.log(`Memory increase: ${memoryIncrease} bytes (${memoryIncreasePercent.toFixed(1)}%)`);
      
      // Should not use excessive memory for text operations
      expect(memoryIncreasePercent).toBeLessThan(100);
    }
  });

  test('Canvas object disposal verification', async ({ page }) => {
    console.log('Testing canvas object disposal...');
    
    // Create objects and verify proper disposal
    const operations = [
      { action: 'add', count: 10 },
      { action: 'delete', count: 5 },
      { action: 'add', count: 15 },
      { action: 'undo', count: 10 },
      { action: 'redo', count: 5 },
      { action: 'reset', count: 0 }
    ];

    for (const operation of operations) {
      switch (operation.action) {
        case 'add':
          for (let i = 0; i < operation.count; i++) {
            await page.click('button:has-text("Add Text")');
            await page.waitForTimeout(50);
          }
          break;
          
        case 'delete':
          for (let i = 0; i < operation.count; i++) {
            const layerCount = await page.locator('[data-testid="layer-item"]').count();
            if (layerCount > 0) {
              await page.click('[data-testid="layer-item"]:first-child');
              await page.keyboard.press('Delete');
              await page.waitForTimeout(50);
            }
          }
          break;
          
        case 'undo':
          for (let i = 0; i < operation.count; i++) {
            await page.keyboard.press('Control+z');
            await page.waitForTimeout(50);
          }
          break;
          
        case 'redo':
          for (let i = 0; i < operation.count; i++) {
            await page.keyboard.press('Control+y');
            await page.waitForTimeout(50);
          }
          break;
          
        case 'reset':
          await page.click('button:has-text("Reset")');
          page.on('dialog', dialog => dialog.accept());
          await page.waitForTimeout(500);
          break;
      }

      const objectCount = await getCanvasObjectCount(page);
      console.log(`After ${operation.action}: ${objectCount} objects`);
      
      // Reset should clear everything
      if (operation.action === 'reset') {
        expect(objectCount).toBe(0);
      }
    }

    // Verify canvas is clean and functional
    await page.click('button:has-text("Add Text")');
    const finalCount = await getCanvasObjectCount(page);
    expect(finalCount).toBe(1);
    
    console.log('Object disposal verification passed');
  });
});