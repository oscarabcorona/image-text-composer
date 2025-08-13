import { test, expect } from '@playwright/test';
import { setupBasicTest, getCanvasInfo } from './test-utils';

/**
 * Drag and Drop UI Tests
 * 
 * Note: Due to browser security restrictions, we cannot fully simulate drag and drop
 * with real files in automated tests. These tests verify the UI behavior and state
 * management. For actual file upload testing, see drag-drop-integration.spec.ts
 */

test.describe('Drag and Drop UI Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicTest(page);
  });

  test('should show drag indicator on dragover event', async ({ page }) => {
    // Trigger dragover event to test UI response
    await page.evaluate(() => {
      const canvasElement = document.querySelector('canvas');
      const dropTarget = canvasElement?.parentElement?.parentElement;
      
      if (dropTarget) {
        // Create and dispatch dragover event
        const dragOverEvent = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
        });
        
        dropTarget.dispatchEvent(dragOverEvent);
      }
    });

    await page.waitForTimeout(100);

    // Check for visual feedback
    const ringIndicator = page.locator('.ring-blue-500');
    await expect(ringIndicator).toBeVisible();
    
    const dropMessage = page.locator('text=Drop image here');
    await expect(dropMessage).toBeVisible();
  });

  test('should hide drag indicator on dragleave event', async ({ page }) => {
    // First trigger dragover to show indicator
    await page.evaluate(() => {
      const canvasElement = document.querySelector('canvas');
      const dropTarget = canvasElement?.parentElement?.parentElement;
      
      if (dropTarget) {
        const dragOverEvent = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
        });
        dropTarget.dispatchEvent(dragOverEvent);
      }
    });

    await page.waitForTimeout(100);

    // Verify indicator is showing
    const dropMessage = page.locator('text=Drop image here');
    await expect(dropMessage).toBeVisible();

    // Now trigger dragleave
    await page.evaluate(() => {
      const canvasElement = document.querySelector('canvas');
      const dropTarget = canvasElement?.parentElement?.parentElement;
      
      if (dropTarget) {
        const rect = dropTarget.getBoundingClientRect();
        const dragLeaveEvent = new DragEvent('dragleave', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left - 10, // Outside bounds
          clientY: rect.top - 10,
        });
        dropTarget.dispatchEvent(dragLeaveEvent);
      }
    });

    await page.waitForTimeout(100);

    // Verify indicator is hidden
    await expect(dropMessage).not.toBeVisible();
  });

  test('drop event prevents default behavior', async ({ page }) => {
    // Test that drop event is handled (prevents browser default)
    const dropPrevented = await page.evaluate(() => {
      const canvasElement = document.querySelector('canvas');
      const dropTarget = canvasElement?.parentElement?.parentElement;
      
      if (!dropTarget) return false;
      
      let defaultPrevented = false;
      
      // Create drop event
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
      });
      
      // Override preventDefault to track if it was called
      dropEvent.preventDefault = function() {
        defaultPrevented = true;
        DragEvent.prototype.preventDefault.call(this);
      };
      
      dropTarget.dispatchEvent(dropEvent);
      
      return defaultPrevented;
    });

    expect(dropPrevented).toBe(true);
  });

  test('drag state is properly managed', async ({ page }) => {
    // Check initial state
    const initialDropMessage = page.locator('text=Drop image here');
    await expect(initialDropMessage).not.toBeVisible();

    // Trigger drag state multiple times
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const canvasElement = document.querySelector('canvas');
        const dropTarget = canvasElement?.parentElement?.parentElement;
        
        if (dropTarget) {
          const dragOverEvent = new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
          });
          dropTarget.dispatchEvent(dragOverEvent);
        }
      });

      await page.waitForTimeout(50);
    }

    // Should still show indicator (not accumulate state)
    const indicators = await page.locator('text=Drop image here').count();
    expect(indicators).toBe(1);

    // Clear drag state
    await page.evaluate(() => {
      const canvasElement = document.querySelector('canvas');
      const dropTarget = canvasElement?.parentElement?.parentElement;
      
      if (dropTarget) {
        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
        });
        dropTarget.dispatchEvent(dropEvent);
      }
    });

    await page.waitForTimeout(100);

    // Should be hidden after drop
    await expect(initialDropMessage).not.toBeVisible();
  });

  test('drag and drop container has correct styling', async ({ page }) => {
    // Check initial state
    const container = page.locator('.shadow-2xl').first();
    
    // Should not have drag styling initially
    const initialClasses = await container.getAttribute('class');
    expect(initialClasses).not.toContain('ring-4');
    expect(initialClasses).not.toContain('ring-blue-500');

    // Trigger drag state
    await page.evaluate(() => {
      const canvasElement = document.querySelector('canvas');
      const dropTarget = canvasElement?.parentElement?.parentElement;
      
      if (dropTarget) {
        const dragOverEvent = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
        });
        dropTarget.dispatchEvent(dragOverEvent);
      }
    });

    await page.waitForTimeout(100);

    // Should have drag styling
    const dragClasses = await container.getAttribute('class');
    expect(dragClasses).toContain('ring-4');
    expect(dragClasses).toContain('ring-blue-500');
    expect(dragClasses).toContain('ring-opacity-50');
  });

  test('multiple drag events are handled correctly', async ({ page }) => {
    // Simulate rapid drag enter/leave events
    await page.evaluate(() => {
      const canvasElement = document.querySelector('canvas');
      const dropTarget = canvasElement?.parentElement?.parentElement;
      
      if (dropTarget) {
        // Rapid fire events
        for (let i = 0; i < 5; i++) {
          const dragOverEvent = new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
          });
          dropTarget.dispatchEvent(dragOverEvent);
          
          const dragLeaveEvent = new DragEvent('dragleave', {
            bubbles: true,
            cancelable: true,
          });
          dropTarget.dispatchEvent(dragLeaveEvent);
        }
        
        // End with dragover
        const finalDragOver = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
        });
        dropTarget.dispatchEvent(finalDragOver);
      }
    });

    await page.waitForTimeout(200);

    // Should show indicator after rapid events
    const dropMessage = page.locator('text=Drop image here');
    await expect(dropMessage).toBeVisible();
    
    // Should only have one indicator
    const count = await dropMessage.count();
    expect(count).toBe(1);
  });

  test('drag and drop works with existing content', async ({ page }) => {
    // Add some text layers first
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(300);

    // Verify text layers exist
    const info = await getCanvasInfo(page);
    expect(info.objects).toBe(2);

    // Trigger drag state
    await page.evaluate(() => {
      const canvasElement = document.querySelector('canvas');
      const dropTarget = canvasElement?.parentElement?.parentElement;
      
      if (dropTarget) {
        const dragOverEvent = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
        });
        dropTarget.dispatchEvent(dragOverEvent);
      }
    });

    await page.waitForTimeout(100);

    // Drag indicator should still show
    const dropMessage = page.locator('text=Drop image here');
    await expect(dropMessage).toBeVisible();

    // Text layers should still be there
    const afterInfo = await getCanvasInfo(page);
    expect(afterInfo.objects).toBe(2);
  });
});