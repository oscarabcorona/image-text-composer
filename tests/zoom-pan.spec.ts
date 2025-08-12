import { test, expect } from '@playwright/test';

test.describe('Zoom and Pan Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Zoom controls are visible and functional', async ({ page }) => {
    // Check zoom controls are present
    const zoomOutBtn = page.locator('button[title="Zoom out (Ctrl+-)"]');
    const zoomInBtn = page.locator('button[title="Zoom in (Ctrl++)"]');
    const zoomSelect = page.locator('select').filter({ hasText: '100%' });
    const fitBtn = page.locator('button[title="Fit to window (Ctrl+9)"]');
    
    await expect(zoomOutBtn).toBeVisible();
    await expect(zoomInBtn).toBeVisible();
    await expect(zoomSelect).toBeVisible();
    await expect(fitBtn).toBeVisible();
    
    // Add text to have something to zoom
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    // Test zoom in
    await zoomInBtn.click();
    await page.waitForTimeout(200);
    
    // Check zoom level increased
    const zoomLevel = await page.evaluate(() => {
      return (window as any).canvas?.getZoom() || 1;
    });
    expect(zoomLevel).toBeGreaterThan(1);
    
    // Test zoom out
    await zoomOutBtn.click();
    await zoomOutBtn.click();
    await page.waitForTimeout(200);
    
    const newZoomLevel = await page.evaluate(() => {
      return (window as any).canvas?.getZoom() || 1;
    });
    expect(newZoomLevel).toBeLessThan(zoomLevel);
    
    await page.screenshot({ path: 'tests/screenshots/zoom-controls.png' });
  });

  test('Zoom keyboard shortcuts work', async ({ page }) => {
    // Add content first
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    // Test Ctrl/Cmd + Plus (zoom in)
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}++`);
    await page.waitForTimeout(200);
    
    let zoomLevel = await page.evaluate(() => {
      return (window as any).canvas?.getZoom() || 1;
    });
    expect(zoomLevel).toBeGreaterThan(1);
    
    // Test Ctrl/Cmd + Minus (zoom out)
    await page.keyboard.press(`${modifier}+-`);
    await page.waitForTimeout(200);
    
    zoomLevel = await page.evaluate(() => {
      return (window as any).canvas?.getZoom() || 1;
    });
    expect(zoomLevel).toBe(1);
    
    // Test Ctrl/Cmd + 0 (reset zoom)
    await page.keyboard.press(`${modifier}++`);
    await page.keyboard.press(`${modifier}++`);
    await page.keyboard.press(`${modifier}+0`);
    await page.waitForTimeout(200);
    
    zoomLevel = await page.evaluate(() => {
      return (window as any).canvas?.getZoom() || 1;
    });
    expect(zoomLevel).toBe(1);
  });

  test('Mouse wheel zoom works with Ctrl/Cmd', async ({ page }) => {
    // Add content
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    
    // Zoom in with mouse wheel
    await page.keyboard.down(process.platform === 'darwin' ? 'Meta' : 'Control');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -100); // Negative for zoom in
    await page.keyboard.up(process.platform === 'darwin' ? 'Meta' : 'Control');
    await page.waitForTimeout(200);
    
    const zoomLevel = await page.evaluate(() => {
      return (window as any).canvas?.getZoom() || 1;
    });
    expect(zoomLevel).toBeGreaterThan(1);
  });

  test('Pan mode can be activated with Space key', async ({ page }) => {
    // Add content
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    // Hold space key
    await page.keyboard.down('Space');
    await page.waitForTimeout(200);
    
    // Check if pan mode is active
    const isPanning = await page.evaluate(() => {
      const store = (window as any).useEditorStore?.getState();
      return store?.isPanning || false;
    });
    expect(isPanning).toBeTruthy();
    
    // Check cursor changed
    const cursor = await page.evaluate(() => {
      return (window as any).canvas?.defaultCursor;
    });
    expect(cursor).toBe('grab');
    
    // Release space key
    await page.keyboard.up('Space');
    await page.waitForTimeout(200);
    
    // Check pan mode is deactivated
    const isPanningAfter = await page.evaluate(() => {
      const store = (window as any).useEditorStore?.getState();
      return store?.isPanning || false;
    });
    expect(isPanningAfter).toBeFalsy();
  });

  test('Hand tool button toggles pan mode', async ({ page }) => {
    // Add content
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    const handBtn = page.locator('button[title="Pan mode (Hold Space)"]');
    
    // Click hand tool
    await handBtn.click();
    await page.waitForTimeout(200);
    
    // Check button is active (has different variant)
    await expect(handBtn).toHaveClass(/variant-default|bg-primary/);
    
    // Check pan mode is active
    const isPanning = await page.evaluate(() => {
      const store = (window as any).useEditorStore?.getState();
      return store?.isPanning || false;
    });
    expect(isPanning).toBeTruthy();
    
    // Click again to deactivate
    await handBtn.click();
    await page.waitForTimeout(200);
    
    const isPanningAfter = await page.evaluate(() => {
      const store = (window as any).useEditorStore?.getState();
      return store?.isPanning || false;
    });
    expect(isPanningAfter).toBeFalsy();
  });

  test('Pan with mouse drag works', async ({ page }) => {
    // Add content and zoom in first
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    // Zoom in to make panning useful
    await page.click('button[title="Zoom in (Ctrl++)"]');
    await page.click('button[title="Zoom in (Ctrl++)"]');
    await page.waitForTimeout(200);
    
    // Activate pan mode
    await page.keyboard.down('Space');
    await page.waitForTimeout(200);
    
    // Get initial viewport transform
    const initialTransform = await page.evaluate(() => {
      return (window as any).canvas?.viewportTransform || [1, 0, 0, 1, 0, 0];
    });
    
    // Pan with mouse
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100);
    await page.mouse.up();
    
    // Release space
    await page.keyboard.up('Space');
    await page.waitForTimeout(200);
    
    // Check viewport has moved
    const newTransform = await page.evaluate(() => {
      return (window as any).canvas?.viewportTransform || [1, 0, 0, 1, 0, 0];
    });
    
    expect(newTransform[4]).not.toBe(initialTransform[4]); // X translation changed
    expect(newTransform[5]).not.toBe(initialTransform[5]); // Y translation changed
    
    await page.screenshot({ path: 'tests/screenshots/after-pan.png' });
  });

  test('Zoom presets in dropdown work', async ({ page }) => {
    // Add content
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    const zoomSelect = page.locator('select').first();
    
    // Select 50%
    await zoomSelect.selectOption('0.5');
    await page.waitForTimeout(200);
    
    let zoomLevel = await page.evaluate(() => {
      return (window as any).canvas?.getZoom() || 1;
    });
    expect(zoomLevel).toBe(0.5);
    
    // Select 200%
    await zoomSelect.selectOption('2');
    await page.waitForTimeout(200);
    
    zoomLevel = await page.evaluate(() => {
      return (window as any).canvas?.getZoom() || 1;
    });
    expect(zoomLevel).toBe(2);
    
    // Select 100%
    await zoomSelect.selectOption('1');
    await page.waitForTimeout(200);
    
    zoomLevel = await page.evaluate(() => {
      return (window as any).canvas?.getZoom() || 1;
    });
    expect(zoomLevel).toBe(1);
  });

  test('Fit to window button works', async ({ page }) => {
    // Upload a large image first
    const largeImageData = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 2000;
      canvas.height = 1500;
      const ctx = canvas.getContext('2d');
      ctx!.fillStyle = 'blue';
      ctx!.fillRect(0, 0, 2000, 1500);
      return canvas.toDataURL('image/png');
    });

    await page.evaluate((dataUrl) => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File([
        Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0))
      ], 'large.png', { type: 'image/png' });
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      Object.defineProperty(input, 'files', {
        value: dataTransfer.files,
        writable: false,
      });
      
      const event = new Event('change', { bubbles: true });
      input.dispatchEvent(event);
    }, largeImageData);

    await page.waitForTimeout(1000);
    
    // Click fit to window
    await page.click('button[title="Fit to window (Ctrl+9)"]');
    await page.waitForTimeout(500);
    
    // Check zoom level is appropriate
    const zoomLevel = await page.evaluate(() => {
      return (window as any).canvas?.getZoom() || 1;
    });
    
    // Should be less than 1 for a large image
    expect(zoomLevel).toBeLessThan(1);
    expect(zoomLevel).toBeGreaterThan(0);
    
    await page.screenshot({ path: 'tests/screenshots/fit-to-window.png' });
  });
});