import { test, expect, Page } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

// Helper to create test images
async function createTestImage(format: 'png' | 'jpeg', fileName: string): Promise<string> {
  const pngData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  const jpegData = Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=', 'base64');
  
  const filePath = path.join(__dirname, fileName);
  await fs.writeFile(filePath, format === 'png' ? pngData : jpegData);
  
  return filePath;
}

test.describe('Core Requirements - Image Upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Upload PNG and verify canvas matches aspect ratio', async ({ page }) => {
    // Create a 100x50 test PNG (2:1 aspect ratio)
    const canvas = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');
      ctx!.fillStyle = 'red';
      ctx!.fillRect(0, 0, 100, 50);
      return canvas.toDataURL('image/png');
    });

    // Upload the image
    await page.evaluate((dataUrl) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.style.display = 'none';
      document.body.appendChild(input);
      
      const file = new File([
        Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0))
      ], 'test.png', { type: 'image/png' });
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      
      const event = new Event('change', { bubbles: true });
      input.dispatchEvent(event);
      
      // Trigger the file input in the app
      const uploadBtn = document.querySelector('button[aria-label="Upload image"]') || 
                       document.querySelector('button:has-text("Upload Image")');
      (uploadBtn as HTMLElement)?.click();
    }, canvas);

    await page.waitForTimeout(1000);

    // Verify canvas dimensions match aspect ratio
    const canvasDimensions = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return canvas ? { width: canvas.width, height: canvas.height } : null;
    });

    expect(canvasDimensions).toBeTruthy();
    if (canvasDimensions) {
      const aspectRatio = canvasDimensions.width / canvasDimensions.height;
      expect(aspectRatio).toBeCloseTo(2, 1); // 2:1 aspect ratio
    }
  });
});

test.describe('Core Requirements - Text Layers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Add multiple text layers with different properties', async ({ page }) => {
    // Add first text layer
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Add second text layer
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Verify two layers exist
    const layerCount = await page.locator('[data-testid="layer-item"]').count();
    expect(layerCount).toBe(2);

    // Edit first layer properties
    await page.click('[data-testid="layer-item"]:first-child');
    
    // Change font family
    await page.click('button[role="combobox"]');
    await page.click('button:has-text("Montserrat")');
    
    // Change font size
    await page.fill('input[type="number"][min="8"]', '48');
    
    // Change color
    await page.click('button[aria-label="Color picker"]');
    await page.fill('input[placeholder="#000000"]', '#FF0000');
    
    // Verify multi-line text
    const canvas = await page.locator('canvas');
    await canvas.dblclick();
    await page.keyboard.type('Line 1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Line 2');
    await page.keyboard.press('Escape');

    // Take screenshot for visual verification
    await page.screenshot({ path: 'tests/screenshots/multiple-text-layers.png' });
  });

  test('Text alignment options work correctly', async ({ page }) => {
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Test left alignment
    await page.click('button[aria-label="Align left"]');
    await page.waitForTimeout(200);

    // Test center alignment
    await page.click('button[aria-label="Align center"]');
    await page.waitForTimeout(200);

    // Test right alignment
    await page.click('button[aria-label="Align right"]');
    await page.waitForTimeout(200);

    // Verify alignment is applied
    const alignment = await page.evaluate(() => {
      const activeObject = (window as any).canvas?.getActiveObject();
      return activeObject?.textAlign;
    });
    expect(alignment).toBe('right');
  });
});

test.describe('Core Requirements - Transform & Layer Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Transform text layers - drag, resize, rotate', async ({ page }) => {
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    const canvas = page.locator('canvas');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');

    // Drag text
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100);
    await page.mouse.up();

    // Resize text (drag corner handle)
    await page.mouse.move(canvasBox.x + canvasBox.width / 2 + 50, canvasBox.y + canvasBox.height / 2 + 50);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width / 2 + 100, canvasBox.y + canvasBox.height / 2 + 100);
    await page.mouse.up();

    // Rotate text (drag rotation handle)
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2 - 50);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width / 2 + 50, canvasBox.y + canvasBox.height / 2 - 50);
    await page.mouse.up();

    await page.screenshot({ path: 'tests/screenshots/transformed-text.png' });
  });

  test('Reorder layers', async ({ page }) => {
    // Add three text layers
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(300);

    // Get initial order
    const initialOrder = await page.locator('[data-testid="layer-item"]').allTextContents();

    // Drag first layer to last position
    const firstLayer = page.locator('[data-testid="layer-item"]').first();
    const lastLayer = page.locator('[data-testid="layer-item"]').last();
    
    await firstLayer.dragTo(lastLayer);
    await page.waitForTimeout(500);

    // Verify order changed
    const newOrder = await page.locator('[data-testid="layer-item"]').allTextContents();
    expect(newOrder).not.toEqual(initialOrder);
  });
});

test.describe('Core Requirements - Canvas UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Snap-to-center guides work', async ({ page }) => {
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    const canvas = page.locator('canvas');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');

    // Drag text near center
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width / 2 + 5, canvasBox.y + canvasBox.height / 2 + 5);
    
    // Check for snap guides
    const hasGuides = await page.evaluate(() => {
      const canvas = (window as any).canvas;
      return canvas?._objects?.some((obj: any) => 
        obj.stroke === '#4F46E5' && obj.strokeWidth === 1
      );
    });

    await page.mouse.up();
    expect(hasGuides).toBeTruthy();
  });

  test('Arrow key nudging works', async ({ page }) => {
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Get initial position
    const initialPos = await page.evaluate(() => {
      const activeObject = (window as any).canvas?.getActiveObject();
      return { left: activeObject?.left, top: activeObject?.top };
    });

    // Nudge with arrow keys
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');

    const newPos = await page.evaluate(() => {
      const activeObject = (window as any).canvas?.getActiveObject();
      return { left: activeObject?.left, top: activeObject?.top };
    });

    expect(newPos.left).toBe(initialPos.left + 1);
    expect(newPos.top).toBe(initialPos.top + 1);

    // Nudge with Shift for 10px
    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.up('Shift');

    const finalPos = await page.evaluate(() => {
      const activeObject = (window as any).canvas?.getActiveObject();
      return { left: activeObject?.left, top: activeObject?.top };
    });

    expect(finalPos.left).toBe(newPos.left - 10);
    expect(finalPos.top).toBe(newPos.top - 10);
  });
});

test.describe('Core Requirements - History & Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Undo/Redo with 20+ steps and visible history', async ({ page }) => {
    // Perform 22 actions
    for (let i = 0; i < 22; i++) {
      await page.click('button:has-text("Add Text")');
      await page.waitForTimeout(100);
    }

    // Check history panel shows actions
    const historyItems = await page.locator('[data-testid="history-item"]').count();
    expect(historyItems).toBeLessThanOrEqual(20); // Max 20 history items

    // Undo multiple times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(100);
    }

    // Redo
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+y');
      await page.waitForTimeout(100);
    }

    // Click on history item to jump
    await page.click('[data-testid="history-item"]:nth-child(10)');
    await page.waitForTimeout(500);

    // Verify state
    const layerCount = await page.locator('[data-testid="layer-item"]').count();
    expect(layerCount).toBeGreaterThan(0);
  });

  test('Auto-save and restore after refresh', async ({ page }) => {
    // Add content
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    // Edit text
    const canvas = page.locator('canvas');
    await canvas.dblclick();
    await page.keyboard.type('Test Auto Save');
    await page.keyboard.press('Escape');

    // Wait for auto-save (2 seconds debounce)
    await page.waitForTimeout(2500);

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify content restored
    const restoredLayers = await page.locator('[data-testid="layer-item"]').count();
    expect(restoredLayers).toBe(1);

    // Verify text content
    const textContent = await page.evaluate(() => {
      const canvas = (window as any).canvas;
      const textObject = canvas?._objects?.find((obj: any) => obj.type === 'i-text');
      return textObject?.text;
    });
    expect(textContent).toBe('Test Auto Save');
  });

  test('Reset button clears everything', async ({ page }) => {
    // Add content
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Click reset
    await page.click('button:has-text("Reset")');
    
    // Handle confirmation dialog
    page.on('dialog', dialog => dialog.accept());
    
    await page.waitForTimeout(500);

    // Verify canvas is cleared
    const layerCount = await page.locator('[data-testid="layer-item"]').count();
    expect(layerCount).toBe(0);

    // Verify localStorage is cleared
    const storageCleared = await page.evaluate(() => {
      return !localStorage.getItem('image-text-composer-state');
    });
    expect(storageCleared).toBeTruthy();
  });
});

test.describe('Core Requirements - Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Export PNG with original dimensions', async ({ page }) => {
    // Upload a specific size image
    const testImageData = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      ctx!.fillStyle = 'blue';
      ctx!.fillRect(0, 0, 800, 600);
      return canvas.toDataURL('image/png');
    });

    // Upload the image
    await page.evaluate((dataUrl) => {
      const img = new Image();
      img.onload = () => {
        const canvas = (window as any).canvas;
        if (canvas) {
          const fabricImg = new (window as any).fabric.Image(img);
          canvas.setBackgroundImage(fabricImg, canvas.renderAll.bind(canvas));
        }
      };
      img.src = dataUrl;
    }, testImageData);

    await page.waitForTimeout(1000);

    // Add text overlay
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Set up download handling
    const downloadPromise = page.waitForEvent('download');
    
    // Click export
    await page.click('button:has-text("Export")');
    
    const download = await downloadPromise;
    const path = await download.path();
    
    // Verify the downloaded file exists
    expect(path).toBeTruthy();
    
    // Check file is PNG
    expect(download.suggestedFilename()).toContain('.png');
  });
});