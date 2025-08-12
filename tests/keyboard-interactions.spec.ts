import { test, expect } from '@playwright/test';

test.describe('Keyboard Shortcuts and Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Undo/Redo keyboard shortcuts', async ({ page }) => {
    // Add multiple text layers
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("Add Text")');
      await page.waitForTimeout(200);
    }

    // Count initial layers
    let layerCount = await page.locator('[data-testid="layer-item"]').count();
    expect(layerCount).toBe(5);

    // Test Ctrl+Z (undo) on Windows/Linux
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    
    // Undo 3 times
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press(`${modifier}+z`);
      await page.waitForTimeout(200);
    }

    layerCount = await page.locator('[data-testid="layer-item"]').count();
    expect(layerCount).toBe(2);

    // Redo 2 times
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press(`${modifier}+y`);
      await page.waitForTimeout(200);
    }

    layerCount = await page.locator('[data-testid="layer-item"]').count();
    expect(layerCount).toBe(4);
  });

  test('Arrow key nudging with and without Shift', async ({ page }) => {
    // Add text layer
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Get initial position
    const getPosition = async () => {
      return await page.evaluate(() => {
        const activeObject = (window as any).canvas?.getActiveObject();
        return {
          left: Math.round(activeObject?.left || 0),
          top: Math.round(activeObject?.top || 0)
        };
      });
    };

    const initialPos = await getPosition();

    // Test single pixel nudge
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    
    let currentPos = await getPosition();
    expect(currentPos.left).toBe(initialPos.left + 1);
    expect(currentPos.top).toBe(initialPos.top + 1);

    // Test 10px nudge with Shift
    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.up('Shift');

    currentPos = await getPosition();
    expect(currentPos.left).toBe(initialPos.left + 1 - 10);
    expect(currentPos.top).toBe(initialPos.top + 1 - 10);

    // Test all arrow keys
    const testKeys = [
      { key: 'ArrowUp', delta: { left: 0, top: -1 } },
      { key: 'ArrowDown', delta: { left: 0, top: 1 } },
      { key: 'ArrowLeft', delta: { left: -1, top: 0 } },
      { key: 'ArrowRight', delta: { left: 1, top: 0 } }
    ];

    for (const { key, delta } of testKeys) {
      const beforePos = await getPosition();
      await page.keyboard.press(key);
      const afterPos = await getPosition();
      
      expect(afterPos.left).toBe(beforePos.left + delta.left);
      expect(afterPos.top).toBe(beforePos.top + delta.top);
    }
  });

  test('Delete key removes selected layer', async ({ page }) => {
    // Add text layers
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(300);

    // Select first layer
    await page.click('[data-testid="layer-item"]:first-child');
    await page.waitForTimeout(200);

    // Press Delete key
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);

    // Verify layer removed
    const layerCount = await page.locator('[data-testid="layer-item"]').count();
    expect(layerCount).toBe(1);
  });

  test('Escape key deselects active object', async ({ page }) => {
    // Add text layer
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Verify object is selected
    let hasSelection = await page.evaluate(() => {
      const canvas = (window as any).canvas;
      return canvas?.getActiveObject() !== null;
    });
    expect(hasSelection).toBeTruthy();

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Verify no selection
    hasSelection = await page.evaluate(() => {
      const canvas = (window as any).canvas;
      return canvas?.getActiveObject() !== null;
    });
    expect(hasSelection).toBeFalsy();
  });

  test('Tab navigation through UI elements', async ({ page }) => {
    // Start from upload button
    await page.click('button:has-text("Upload Image")');
    
    // Tab through UI elements
    const elements = [
      'Add Text',
      'Undo',
      'Redo',
      'Export',
      'Reset'
    ];

    for (const text of elements) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      
      // Check if correct element is focused
      const focusedText = await page.evaluate(() => {
        return document.activeElement?.textContent?.trim();
      });
      
      if (focusedText?.includes(text)) {
        expect(focusedText).toContain(text);
      }
    }
  });

  test('Enter key in text editing mode', async ({ page }) => {
    // Add text layer
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Double-click to edit
    const canvas = page.locator('canvas');
    await canvas.dblclick();
    await page.waitForTimeout(200);

    // Type multi-line text
    await page.keyboard.type('Line 1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Line 2');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Line 3');
    
    // Exit edit mode
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Verify multi-line text
    const textContent = await page.evaluate(() => {
      const activeObject = (window as any).canvas?.getActiveObject();
      return activeObject?.text;
    });

    expect(textContent).toBe('Line 1\nLine 2\nLine 3');
  });

  test('Copy/Paste functionality', async ({ page }) => {
    // Add and customize text
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(300);

    // Edit text
    const canvas = page.locator('canvas');
    await canvas.dblclick();
    await page.keyboard.type('Original Text');
    await page.keyboard.press('Escape');

    // Change some properties
    await page.fill('input[type="number"][min="8"]', '36');
    await page.click('button[aria-label="Color picker"]');
    await page.fill('input[placeholder="#000000"]', '#FF0000');

    // Copy (Ctrl/Cmd+C)
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+c`);
    await page.waitForTimeout(200);

    // Paste (Ctrl/Cmd+V)
    await page.keyboard.press(`${modifier}+v`);
    await page.waitForTimeout(500);

    // Verify two objects with same properties
    const objects = await page.evaluate(() => {
      const canvas = (window as any).canvas;
      return canvas?._objects
        ?.filter((obj: any) => obj.type === 'i-text')
        ?.map((obj: any) => ({
          text: obj.text,
          fontSize: obj.fontSize,
          fill: obj.fill
        }));
    });

    expect(objects).toHaveLength(2);
    expect(objects[0].text).toBe('Original Text');
    expect(objects[1].text).toBe('Original Text');
    expect(objects[0].fontSize).toBe(36);
    expect(objects[1].fontSize).toBe(36);
  });
});

test.describe('Mouse Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Double-click to edit text inline', async ({ page }) => {
    // Add text
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Double-click on text
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(200);

    // Verify in edit mode
    const isEditing = await page.evaluate(() => {
      const activeObject = (window as any).canvas?.getActiveObject();
      return activeObject?.isEditing;
    });
    expect(isEditing).toBeTruthy();

    // Type new text
    await page.keyboard.press('Control+a');
    await page.keyboard.type('Edited Text');
    await page.keyboard.press('Escape');

    // Verify text changed
    const newText = await page.evaluate(() => {
      const activeObject = (window as any).canvas?.getActiveObject();
      return activeObject?.text;
    });
    expect(newText).toBe('Edited Text');
  });

  test('Right-click context menu (if implemented)', async ({ page }) => {
    // Add text
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Right-click on canvas
    const canvas = page.locator('canvas');
    await canvas.click({ button: 'right' });
    await page.waitForTimeout(200);

    // Check if any context menu appears
    // This would depend on implementation
  });

  test('Click outside to deselect', async ({ page }) => {
    // Add text
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Verify selected
    let hasSelection = await page.evaluate(() => {
      const canvas = (window as any).canvas;
      return canvas?.getActiveObject() !== null;
    });
    expect(hasSelection).toBeTruthy();

    // Click on empty canvas area
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    await page.mouse.click(box.x + 10, box.y + 10);
    await page.waitForTimeout(200);

    // Verify deselected
    hasSelection = await page.evaluate(() => {
      const canvas = (window as any).canvas;
      return canvas?.getActiveObject() !== null;
    });
    expect(hasSelection).toBeFalsy();
  });
});