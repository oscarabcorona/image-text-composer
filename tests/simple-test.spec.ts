import { test, expect } from '@playwright/test';

test.describe('Simple Application Tests', () => {
  test('Application loads successfully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check title (wait a bit longer for Next.js to load)
    await page.waitForTimeout(1000);
    const title = await page.title();
    expect(title).toContain('Image Text Composer');
    
    // Check main UI elements are visible
    await expect(page.getByRole('button', { name: /upload image/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /add text/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /export/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /reset/i })).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/app-loaded.png', fullPage: true });
  });

  test('Add text layer works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Click Add Text button
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    // Check if layer was added
    const layerItems = await page.locator('[data-testid="layer-item"]').count();
    expect(layerItems).toBe(1);
    
    // Check if canvas has text object
    const hasTextObject = await page.evaluate(() => {
      const canvas = (window as any).canvas;
      return canvas?._objects?.some((obj: any) => obj.type === 'i-text');
    });
    expect(hasTextObject).toBeTruthy();
  });

  test('Upload image and add text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Create and upload a test image
    await page.evaluate(() => {
      // Create a red 200x100 test image
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      ctx!.fillStyle = 'red';
      ctx!.fillRect(0, 0, 200, 100);
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        
        const file = new File([blob], 'test.png', { type: 'image/png' });
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        
        if (input) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          
          Object.defineProperty(input, 'files', {
            value: dataTransfer.files,
            writable: false,
          });
          
          const event = new Event('change', { bubbles: true });
          input.dispatchEvent(event);
        }
      });
    });
    
    await page.waitForTimeout(1000);
    
    // Add text
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    // Verify both image and text exist
    const canvasState = await page.evaluate(() => {
      const canvas = (window as any).canvas;
      return {
        hasBackground: canvas?.backgroundImage !== null,
        textCount: canvas?._objects?.filter((obj: any) => obj.type === 'i-text').length || 0
      };
    });
    
    expect(canvasState.hasBackground).toBeTruthy();
    expect(canvasState.textCount).toBe(1);
    
    await page.screenshot({ path: 'tests/screenshots/image-with-text.png', fullPage: true });
  });

  test('History panel shows actions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Add a few text layers
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Add Text")');
      await page.waitForTimeout(300);
    }
    
    // Check history panel
    const historyItems = await page.locator('[data-testid="history-item"]').count();
    expect(historyItems).toBeGreaterThan(0);
    
    // Test undo
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);
    
    // Verify layer count decreased
    const layerCount = await page.locator('[data-testid="layer-item"]').count();
    expect(layerCount).toBe(2);
  });

  test('Export functionality triggers download', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Add text
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    // Set up download promise before clicking export
    const downloadPromise = page.waitForEvent('download');
    
    // Click export
    await page.click('button:has-text("Export")');
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/image-text-composition\.png/);
  });
});