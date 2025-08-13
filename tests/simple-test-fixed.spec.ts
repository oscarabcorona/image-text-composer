import { test, expect } from '@playwright/test';

test.describe('Simple Application Tests - Fixed', () => {
  test('Application loads successfully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check title (wait a bit longer for Next.js to load)
    await page.waitForTimeout(2000);
    const title = await page.title();
    expect(title).toContain('Image Text Composer');
    
    // Check main UI elements are visible with correct text
    await expect(page.locator('button:has-text("Upload Image")')).toBeVisible();
    await expect(page.locator('button:has-text("Add Text")')).toBeVisible();
    await expect(page.locator('button:has-text("Export PNG")')).toBeVisible();
    await expect(page.locator('button:has-text("Reset")')).toBeVisible();
    
    // Check canvas exists (Fabric.js creates multiple canvas elements)
    await expect(page.locator('canvas')).toHaveCount(2);
  });

  test('Add text layer works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Click Add Text button
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(1000);
    
    // Check if layer was added
    const layerItems = await page.locator('[data-testid="layer-item"]').count();
    expect(layerItems).toBe(1);
    
    // Check if canvas has text object
    const hasTextObject = await page.evaluate(() => {
      const canvas = (window as any).canvas;
      return canvas?.getObjects?.()?.some((obj: any) => obj.type === 'i-text');
    });
    expect(hasTextObject).toBeTruthy();
  });

  test('Upload image and add text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Create and upload a test image using the method that worked in debug test
    const testImageData = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      ctx!.fillStyle = '#ff0000';
      ctx!.fillRect(0, 0, 200, 100);
      ctx!.fillStyle = '#ffffff';
      ctx!.font = '16px Arial';
      ctx!.fillText('Test', 80, 50);
      return canvas.toDataURL('image/png');
    });

    await page.evaluate((dataUrl) => {
      const file = new File([
        Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0))
      ], 'test.png', { type: 'image/png' });
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, testImageData);
    
    await page.waitForTimeout(1500);
    
    // Add text
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(1000);
    
    // Verify both image and text exist
    const canvasState = await page.evaluate(() => {
      const canvas = (window as any).canvas;
      return {
        hasBackground: canvas?.backgroundImage !== null,
        textCount: canvas?.getObjects?.()?.filter((obj: any) => obj.type === 'i-text').length || 0,
        totalObjects: canvas?.getObjects?.()?.length || 0
      };
    });
    
    expect(canvasState.hasBackground).toBeTruthy();
    expect(canvasState.textCount).toBe(1);
    expect(canvasState.totalObjects).toBe(1);
  });

  test('History panel shows actions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Add a few text layers
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Add Text")');
      await page.waitForTimeout(500);
    }
    
    // Check history panel shows actions (history items might have different structure)
    const historyInfo = await page.evaluate(() => {
      const store = (window as any).useEditorStore?.getState?.();
      return {
        historyLength: store?.history?.length || 0,
        layerCount: store?.layers?.length || 0
      };
    });
    
    expect(historyInfo.historyLength).toBeGreaterThan(0);
    expect(historyInfo.layerCount).toBe(3);
    
    // Test undo
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(500);
    
    // Verify layer count decreased
    const afterUndoInfo = await page.evaluate(() => {
      const store = (window as any).useEditorStore?.getState?.();
      return {
        layerCount: store?.layers?.length || 0
      };
    });
    
    expect(afterUndoInfo.layerCount).toBe(2);
  });

  test('Export functionality triggers download', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Add text first
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(1000);
    
    // Set up download promise before clicking export
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    
    // Click export with correct button text
    await page.click('button:has-text("Export PNG")');
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download occurred
    expect(download.suggestedFilename()).toMatch(/\.png$/);
  });
});