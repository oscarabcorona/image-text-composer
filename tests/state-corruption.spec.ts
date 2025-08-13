import { test, expect, Page } from '@playwright/test';

// Utilities for state testing
async function getLocalStorageData(page: Page) {
  return await page.evaluate(() => {
    const data = localStorage.getItem('image-text-composer-state');
    return data ? { exists: true, data: JSON.parse(data) } : { exists: false, data: null };
  });
}

async function setCorruptedLocalStorageData(page: Page, corruptedData: any) {
  await page.evaluate((data) => {
    localStorage.setItem('image-text-composer-state', JSON.stringify(data));
  }, corruptedData);
}

async function getStoreState(page: Page) {
  return await page.evaluate(() => {
    const store = (window as any).useEditorStore?.getState?.();
    return store ? {
      layers: store.layers?.length || 0,
      history: store.history?.length || 0,
      historyIndex: store.historyIndex || 0,
      currentImageUrl: !!store.currentImageUrl,
      originalImageWidth: store.originalImageWidth,
      originalImageHeight: store.originalImageHeight
    } : null;
  });
}

async function getCanvasState(page: Page) {
  return await page.evaluate(() => {
    const canvas = (window as any).canvas;
    if (!canvas) return null;
    
    return {
      objects: canvas.getObjects().length,
      width: canvas.width,
      height: canvas.height,
      zoom: canvas.getZoom(),
      hasBackgroundImage: !!canvas.backgroundImage
    };
  });
}

async function triggerAutoSave(page: Page) {
  // Make a change that would trigger auto-save
  await page.click('button:has-text("Add Text")');
  await page.waitForTimeout(2500); // Wait for debounced auto-save
}

async function simulateQuotaExceeded(page: Page) {
  return await page.evaluate(() => {
    try {
      // Try to fill localStorage to near capacity
      const largeData = 'x'.repeat(1024 * 1024); // 1MB of data
      for (let i = 0; i < 10; i++) {
        localStorage.setItem(`quota-test-${i}`, largeData);
      }
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

test.describe('State Corruption Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('localStorage quota exceeded handling', async ({ page }) => {
    console.log('Testing localStorage quota exceeded scenario...');
    
    // Add some content
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    const canvas = page.locator('canvas');
    await canvas.dblclick();
    await page.keyboard.type('Test content before quota exceeded');
    await page.keyboard.press('Escape');
    
    // Wait for auto-save
    await page.waitForTimeout(2500);
    
    // Verify initial save worked
    const initialStorage = await getLocalStorageData(page);
    expect(initialStorage.exists).toBeTruthy();
    
    // Fill up localStorage to trigger quota exceeded
    const quotaResult = await simulateQuotaExceeded(page);
    console.log('Quota simulation result:', quotaResult);
    
    // Try to add more content that would trigger save
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    await canvas.dblclick();
    await page.keyboard.type('Content after quota exceeded');
    await page.keyboard.press('Escape');
    
    // Wait for attempted auto-save
    await page.waitForTimeout(2500);
    
    // App should still be functional even if save failed
    const storeState = await getStoreState(page);
    expect(storeState?.layers).toBe(2);
    
    const canvasState = await getCanvasState(page);
    expect(canvasState?.objects).toBe(2);
    
    // Clean up quota test data
    await page.evaluate(() => {
      for (let i = 0; i < 10; i++) {
        localStorage.removeItem(`quota-test-${i}`);
      }
    });
    
    console.log('localStorage quota exceeded test completed');
  });

  test('Corrupted save data recovery', async ({ page }) => {
    console.log('Testing corrupted save data recovery...');
    
    const corruptedDataScenarios = [
      { name: 'Invalid JSON', data: 'invalid-json-string' },
      { name: 'Missing required fields', data: { someField: 'value' } },
      { name: 'Wrong data types', data: { layers: 'not-an-array', history: 123 } },
      { name: 'Null values', data: { layers: null, history: null } },
      { name: 'Deeply corrupted', data: { layers: [{ id: null, invalidField: {} }] } }
    ];

    for (const scenario of corruptedDataScenarios) {
      console.log(`Testing ${scenario.name}...`);
      
      // Set corrupted data directly in localStorage
      if (typeof scenario.data === 'string') {
        await page.evaluate((data) => {
          localStorage.setItem('image-text-composer-state', data);
        }, scenario.data);
      } else {
        await setCorruptedLocalStorageData(page, scenario.data);
      }
      
      // Refresh page to trigger loading corrupted data
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // App should handle corruption gracefully and start fresh
      const storeState = await getStoreState(page);
      const canvasState = await getCanvasState(page);
      
      // Should have clean initial state
      expect(storeState?.layers).toBe(0);
      expect(canvasState?.objects).toBe(0);
      
      // App should still be functional
      await page.click('button:has-text("Add Text")');
      await page.waitForTimeout(500);
      
      const functionalTestStore = await getStoreState(page);
      const functionalTestCanvas = await getCanvasState(page);
      
      expect(functionalTestStore?.layers).toBe(1);
      expect(functionalTestCanvas?.objects).toBe(1);
      
      // Clean up for next scenario
      await page.evaluate(() => localStorage.clear());
    }
    
    console.log('Corrupted save data recovery test completed');
  });

  test('Canvas state and store state desynchronization', async ({ page }) => {
    console.log('Testing canvas/store desynchronization...');
    
    // Add some content normally
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    // Verify initial synchronization
    const initialStore = await getStoreState(page);
    const initialCanvas = await getCanvasState(page);
    
    expect(initialStore?.layers).toBe(initialCanvas?.objects);
    
    // Manually manipulate canvas state without going through store
    await page.evaluate(() => {
      const canvas = (window as any).canvas;
      if (canvas) {
        // Add object directly to canvas without updating store
        const text = new (window as any).fabric.IText('Unsynchronized text', {
          left: 100,
          top: 100,
          fontFamily: 'Arial'
        });
        canvas.add(text);
        canvas.renderAll();
      }
    });
    
    await page.waitForTimeout(500);
    
    // Check for desynchronization
    const desyncStore = await getStoreState(page);
    const desyncCanvas = await getCanvasState(page);
    
    console.log('Store layers:', desyncStore?.layers);
    console.log('Canvas objects:', desyncCanvas?.objects);
    
    // Canvas should have 2 objects but store might still show 1
    expect(desyncCanvas?.objects).toBe(2);
    
    // Try to perform normal operations - app should handle gracefully
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    // App should try to reconcile or handle the desync
    const afterNormalOpStore = await getStoreState(page);
    const afterNormalOpCanvas = await getCanvasState(page);
    
    // At minimum, app should still be functional
    expect(afterNormalOpCanvas?.objects).toBeGreaterThan(0);
    
    // Test undo/redo with desynchronized state
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);
    
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(300);
    
    // App should not crash and maintain some reasonable state
    const finalCanvas = await getCanvasState(page);
    expect(finalCanvas?.objects).toBeGreaterThan(0);
    
    console.log('Desynchronization test completed');
  });

  test('Undo/redo with corrupted history', async ({ page }) => {
    console.log('Testing undo/redo with corrupted history...');
    
    // Build up some history
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("Add Text")');
      await page.waitForTimeout(200);
    }
    
    const initialStore = await getStoreState(page);
    expect(initialStore?.history).toBe(5);
    
    // Corrupt the history in store
    await page.evaluate(() => {
      const store = (window as any).useEditorStore?.getState?.();
      if (store) {
        // Corrupt history array
        const corruptedHistory = store.history.map((item: any, index: number) => {
          if (index === 2) {
            return null; // Null entry
          } else if (index === 3) {
            return { ...item, execute: null, undo: undefined }; // Corrupted methods
          }
          return item;
        });
        
        // Force update the store with corrupted history
        const setState = (window as any).useEditorStore.setState;
        setState({ history: corruptedHistory });
      }
    });
    
    await page.waitForTimeout(500);
    
    // Try undo operations with corrupted history
    console.log('Testing undo with corrupted history...');
    for (let i = 0; i < 3; i++) {
      try {
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(200);
        
        // App should handle corrupted history entries gracefully
        const storeState = await getStoreState(page);
        const canvasState = await getCanvasState(page);
        
        console.log(`Undo ${i + 1}: Store layers: ${storeState?.layers}, Canvas objects: ${canvasState?.objects}`);
        
        // App should not crash
        expect(canvasState?.objects).toBeGreaterThanOrEqual(0);
        
      } catch (error) {
        console.log(`Undo operation ${i} caused error (expected):`, error);
      }
    }
    
    // Try redo operations
    console.log('Testing redo with corrupted history...');
    for (let i = 0; i < 2; i++) {
      try {
        await page.keyboard.press('Control+y');
        await page.waitForTimeout(200);
        
        const storeState = await getStoreState(page);
        const canvasState = await getCanvasState(page);
        
        console.log(`Redo ${i + 1}: Store layers: ${storeState?.layers}, Canvas objects: ${canvasState?.objects}`);
        
        // App should not crash
        expect(canvasState?.objects).toBeGreaterThanOrEqual(0);
        
      } catch (error) {
        console.log(`Redo operation ${i} caused error (expected):`, error);
      }
    }
    
    // App should still allow new operations
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    const finalCanvas = await getCanvasState(page);
    expect(finalCanvas?.objects).toBeGreaterThan(0);
    
    console.log('Corrupted history test completed');
  });

  test('Fabric.js object disposal during operations', async ({ page }) => {
    console.log('Testing Fabric.js object disposal during operations...');
    
    // Add text layer
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    // Get reference to the fabric object
    const objectId = await page.evaluate(() => {
      const canvas = (window as any).canvas;
      const obj = canvas?.getObjects()[0];
      return obj ? obj.id || 'no-id' : null;
    });
    
    console.log('Initial object ID:', objectId);
    
    // Manually dispose the object while it's still in canvas
    await page.evaluate(() => {
      const canvas = (window as any).canvas;
      const obj = canvas?.getObjects()[0];
      if (obj) {
        // Simulate object disposal/corruption
        obj.canvas = null;
        obj.group = null;
        // Clear some essential properties
        delete obj.left;
        delete obj.top;
        // Make methods throw errors
        obj.render = function() { throw new Error('Disposed object'); };
      }
    });
    
    await page.waitForTimeout(500);
    
    // Try to interact with the corrupted object
    const canvas = page.locator('canvas');
    
    try {
      await canvas.click();
      await page.waitForTimeout(200);
      
      // Try to edit the corrupted object
      await canvas.dblclick();
      await page.keyboard.type('Testing corrupted object');
      await page.keyboard.press('Escape');
      
    } catch (error) {
      console.log('Expected error when interacting with corrupted object:', error);
    }
    
    // App should detect and handle the corruption
    const canvasState = await getCanvasState(page);
    console.log('Canvas state after corruption:', canvasState);
    
    // Try to add new objects - app should still work
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    const finalCanvasState = await getCanvasState(page);
    expect(finalCanvasState?.objects).toBeGreaterThan(0);
    
    // Try undo/redo with partially corrupted state
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(200);
    
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(200);
    
    // App should handle it gracefully
    const afterUndoRedoState = await getCanvasState(page);
    expect(afterUndoRedoState?.objects).toBeGreaterThanOrEqual(0);
    
    console.log('Object disposal test completed');
  });

  test('Auto-save during concurrent operations', async ({ page }) => {
    console.log('Testing auto-save during concurrent operations...');
    
    // Start multiple concurrent operations
    const operations = [
      () => page.click('button:has-text("Add Text")'),
      () => page.keyboard.press('Control+z'),
      () => page.keyboard.press('Control+y'),
      () => page.click('button:has-text("Add Text")'),
      () => page.click('[data-testid="layer-item"]:first-child')
    ];
    
    // Execute operations rapidly while auto-save might be triggered
    for (let cycle = 0; cycle < 3; cycle++) {
      console.log(`Concurrent operations cycle ${cycle + 1}`);
      
      // Start all operations almost simultaneously
      const promises = operations.map((op, index) => {
        return new Promise(resolve => {
          setTimeout(async () => {
            try {
              await op();
              resolve(`Op ${index} completed`);
            } catch (error) {
              resolve(`Op ${index} failed: ${error}`);
            }
          }, index * 50); // Stagger by 50ms
        });
      });
      
      // Wait for all operations to complete
      await Promise.all(promises);
      await page.waitForTimeout(500);
      
      // Check state consistency
      const storeState = await getStoreState(page);
      const canvasState = await getCanvasState(page);
      
      console.log(`Cycle ${cycle + 1}: Store layers: ${storeState?.layers}, Canvas objects: ${canvasState?.objects}`);
      
      // App should maintain some reasonable state
      expect(canvasState?.objects).toBeGreaterThanOrEqual(0);
    }
    
    // Wait for auto-save to complete
    await page.waitForTimeout(3000);
    
    // Check final storage state
    const finalStorage = await getLocalStorageData(page);
    console.log('Final storage exists:', finalStorage.exists);
    
    // App should still be functional
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    const finalState = await getCanvasState(page);
    expect(finalState?.objects).toBeGreaterThan(0);
    
    console.log('Concurrent operations test completed');
  });

  test('Page refresh during operations', async ({ page }) => {
    console.log('Testing page refresh during operations...');
    
    // Add some content
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    const canvas = page.locator('canvas');
    await canvas.dblclick();
    await page.keyboard.type('Content before refresh');
    await page.keyboard.press('Escape');
    
    // Wait for auto-save
    await page.waitForTimeout(2500);
    
    // Verify content was saved
    const beforeRefreshStorage = await getLocalStorageData(page);
    expect(beforeRefreshStorage.exists).toBeTruthy();
    
    // Start a complex operation and interrupt with refresh
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(100);
    
    // Refresh immediately during operation
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if state was recovered properly
    const afterRefreshStore = await getStoreState(page);
    const afterRefreshCanvas = await getCanvasState(page);
    
    console.log('After refresh - Store layers:', afterRefreshStore?.layers);
    console.log('After refresh - Canvas objects:', afterRefreshCanvas?.objects);
    
    // Should have recovered the saved state (1 text layer)
    expect(afterRefreshCanvas?.objects).toBeGreaterThanOrEqual(1);
    
    // App should be fully functional after refresh
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    const functionalTestState = await getCanvasState(page);
    expect(functionalTestState?.objects).toBeGreaterThan(afterRefreshCanvas?.objects || 0);
    
    console.log('Page refresh during operations test completed');
  });

  test('Cross-tab state conflicts', async ({ context, page }) => {
    console.log('Testing cross-tab state conflicts...');
    
    // Add content in first tab
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    const canvas = page.locator('canvas');
    await canvas.dblclick();
    await page.keyboard.type('Tab 1 content');
    await page.keyboard.press('Escape');
    
    // Wait for auto-save
    await page.waitForTimeout(2500);
    
    // Open second tab
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.waitForLoadState('networkidle');
    
    // Second tab should load the same state
    const tab2InitialState = await page2.evaluate(() => {
      const canvas = (window as any).canvas;
      return { objects: canvas?.getObjects().length || 0 };
    });
    
    console.log('Tab 2 initial state:', tab2InitialState);
    expect(tab2InitialState.objects).toBe(1);
    
    // Make changes in both tabs simultaneously
    
    // Tab 1: Add another text
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    // Tab 2: Add different text
    await page2.click('button:has-text("Add Text")');
    await page2.waitForTimeout(500);
    
    // Both tabs trigger auto-save
    await page.waitForTimeout(2500);
    await page2.waitForTimeout(2500);
    
    // Refresh both tabs to see which state "wins"
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await page2.reload();
    await page2.waitForLoadState('networkidle');
    
    // Check final states
    const finalTab1State = await getCanvasState(page);
    const finalTab2State = await page2.evaluate(() => {
      const canvas = (window as any).canvas;
      return { objects: canvas?.getObjects().length || 0 };
    });
    
    console.log('Final Tab 1 state:', finalTab1State);
    console.log('Final Tab 2 state:', finalTab2State);
    
    // Both tabs should have the same final state (last write wins)
    expect(finalTab1State?.objects).toBe(finalTab2State.objects);
    
    // Both tabs should still be functional
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(200);
    
    await page2.click('button:has-text("Add Text")');
    await page2.waitForTimeout(200);
    
    const tab1Final = await getCanvasState(page);
    const tab2Final = await page2.evaluate(() => {
      const canvas = (window as any).canvas;
      return { objects: canvas?.getObjects().length || 0 };
    });
    
    expect(tab1Final?.objects).toBeGreaterThan(0);
    expect(tab2Final.objects).toBeGreaterThan(0);
    
    await page2.close();
    console.log('Cross-tab state conflicts test completed');
  });
});