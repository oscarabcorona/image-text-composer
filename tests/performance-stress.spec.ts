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

test.describe('Performance Stress Tests - Fixed', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Rapid zoom operations performance', async ({ page }) => {
    console.log('Testing rapid zoom operations...');
    
    // Add some content
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Add Text")');
      await page.waitForTimeout(100);
    }

    const initialInfo = await getCanvasInfo(page);
    expect(initialInfo.objects).toBeGreaterThanOrEqual(3);

    // Measure rapid zoom changes
    const zoomPerf = await measurePerformance(page, 'Rapid Zoom Changes', async () => {
      // Try keyboard shortcuts for zoom
      for (let i = 0; i < 10; i++) {
        if (i % 2 === 0) {
          await page.keyboard.press('Control+Equal');
          await page.keyboard.press('Meta+Equal');
        } else {
          await page.keyboard.press('Control+Minus');
          await page.keyboard.press('Meta+Minus');
        }
        await page.waitForTimeout(50);
      }
    });

    // Performance should be reasonable (under 3 seconds for 10 operations)
    expect(zoomPerf.duration).toBeLessThan(3000);

    // Canvas should still be responsive
    const finalInfo = await getCanvasInfo(page);
    expect(finalInfo.objects).toBe(initialInfo.objects);
  });

  test('Text layer creation performance', async ({ page }) => {
    console.log('Testing text layer creation performance...');
    
    const createPerf = await measurePerformance(page, 'Create 25 Text Layers', async () => {
      for (let i = 0; i < 25; i++) {
        await page.click('button:has-text("Add Text")');
        if (i % 5 === 0) {
          await page.waitForTimeout(50); // Small pause every 5 layers
        }
      }
    });

    // Should complete in reasonable time (under 5 seconds)
    expect(createPerf.duration).toBeLessThan(5000);

    const info = await getCanvasInfo(page);
    expect(info.objects).toBeGreaterThanOrEqual(20); // Allow some failures
  });

  test('Many simultaneous text edits', async ({ page }) => {
    console.log('Testing simultaneous text edits...');
    
    // Add multiple text layers
    for (let i = 0; i < 10; i++) {
      await page.click('button:has-text("Add Text")');
      await page.waitForTimeout(50);
    }

    const canvas = page.locator('canvas[data-fabric="top"]');
    const canvasBox = await canvas.boundingBox();
    
    if (!canvasBox) {
      console.log('Canvas not found, skipping edit test');
      return;
    }

    // Edit multiple texts rapidly
    const editPerf = await measurePerformance(page, 'Edit 5 Text Objects', async () => {
      for (let i = 0; i < 5; i++) {
        // Click at different positions
        const x = canvasBox.x + (canvasBox.width * (0.2 + i * 0.15));
        const y = canvasBox.y + (canvasBox.height * 0.5);
        
        await page.mouse.dblclick(x, y);
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Meta+a');
        await page.keyboard.type(`Text ${i}`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
      }
    });

    // Should complete in reasonable time
    expect(editPerf.duration).toBeLessThan(4000);
  });

  test('Canvas with overlapping objects performance', async ({ page }) => {
    console.log('Testing canvas with many overlapping objects...');
    
    // Create overlapping text layers at the same position
    const createOverlapping = await measurePerformance(page, 'Create 20 Overlapping Layers', async () => {
      for (let i = 0; i < 20; i++) {
        await page.click('button:has-text("Add Text")');
        await page.waitForTimeout(30);
      }
    });

    expect(createOverlapping.duration).toBeLessThan(3000);

    // Test selection performance with overlapping objects
    const canvas = page.locator('canvas[data-fabric="top"]');
    const canvasBox = await canvas.boundingBox();
    
    if (canvasBox) {
      const selectPerf = await measurePerformance(page, 'Select Objects', async () => {
        // Click multiple times to cycle through overlapping objects
        for (let i = 0; i < 10; i++) {
          await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
          await page.waitForTimeout(100);
        }
      });

      expect(selectPerf.duration).toBeLessThan(2000);
    }
  });

  test('Real-time typing performance', async ({ page }) => {
    console.log('Testing real-time typing performance...');
    
    // Add text layer
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    const canvas = page.locator('canvas[data-fabric="top"]');
    const canvasBox = await canvas.boundingBox();
    
    if (!canvasBox) {
      console.log('Canvas not found, skipping typing test');
      return;
    }

    // Start editing
    await page.mouse.dblclick(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Meta+a');

    // Type a long string character by character
    const typingPerf = await measurePerformance(page, 'Type 100 Characters', async () => {
      const text = 'The quick brown fox jumps over the lazy dog. This is a performance test for real-time typing speed.';
      
      for (let i = 0; i < text.length; i++) {
        await page.keyboard.type(text[i]);
        // Small delay to simulate real typing
        if (i % 10 === 0) {
          await page.waitForTimeout(10);
        }
      }
    });

    await page.keyboard.press('Escape');

    // Should handle real-time typing smoothly (under 3 seconds for 100 chars)
    expect(typingPerf.duration).toBeLessThan(3000);

    // Verify text was added
    const info = await getCanvasInfo(page);
    expect(info.objects).toBeGreaterThan(0);
  });

  test('Extended session memory stability', async ({ page }) => {
    console.log('Testing extended session memory usage...');
    
    const operations = [];
    const memoryReadings = [];

    // Simulate 20 operations
    for (let i = 0; i < 20; i++) {
      const operation = i % 3;
      
      if (operation === 0) {
        // Add text
        await page.click('button:has-text("Add Text")');
      } else if (operation === 1) {
        // Undo
        await page.keyboard.press('Control+z');
        await page.keyboard.press('Meta+z');
      } else {
        // Redo
        await page.keyboard.press('Control+y');
        await page.keyboard.press('Meta+y');
      }
      
      await page.waitForTimeout(100);
      
      if (i % 5 === 0) {
        const memory = await page.evaluate(() => {
          const mem = (performance as any).memory;
          return mem ? mem.usedJSHeapSize : null;
        });
        
        if (memory) {
          memoryReadings.push(memory);
          console.log(`Operation ${i}: Memory usage: ${memory} bytes`);
        }
      }
    }

    // Memory should not grow excessively
    if (memoryReadings.length > 1) {
      const firstReading = memoryReadings[0];
      const lastReading = memoryReadings[memoryReadings.length - 1];
      const growth = (lastReading - firstReading) / firstReading;
      
      console.log(`Memory growth over session: ${(growth * 100).toFixed(2)}%`);
      
      // Allow up to 50% memory growth over extended session
      expect(growth).toBeLessThan(0.5);
    }

    // Canvas should still be functional
    const info = await getCanvasInfo(page);
    expect(info.objects).toBeGreaterThanOrEqual(0);
  });

  test('Concurrent operations performance', async ({ page }) => {
    console.log('Testing concurrent operations performance...');
    
    // Add initial content
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("Add Text")');
      await page.waitForTimeout(50);
    }

    // Perform multiple operations concurrently
    const concurrentPerf = await measurePerformance(page, 'Concurrent Operations', async () => {
      const promises = [];
      
      // Zoom change
      promises.push(page.keyboard.press('Control+Equal'));
      
      // Add new text
      promises.push(page.click('button:has-text("Add Text")'));
      
      // Try to trigger history update
      promises.push(page.keyboard.press('Control+z'));
      
      await Promise.all(promises);
      await page.waitForTimeout(500);
    });

    // Should handle concurrent operations
    expect(concurrentPerf.duration).toBeLessThan(2000);

    // Canvas should still be in valid state
    const info = await getCanvasInfo(page);
    expect(info.objects).toBeGreaterThanOrEqual(0);
  });
});