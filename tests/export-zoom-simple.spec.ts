import { test, expect } from '@playwright/test';

test.describe('Export Zoom Issue', () => {
  test('Export size changes with zoom level', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create and upload a test image
    const testImageData = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      ctx!.fillStyle = '#ff0000';
      ctx!.fillRect(0, 0, 400, 300);
      ctx!.fillStyle = '#ffffff';
      ctx!.font = '30px Arial';
      ctx!.fillText('Test Image 400x300', 50, 150);
      return canvas.toDataURL('image/png');
    });

    // Upload the image
    await page.setInputFiles('input[type="file"]', {
      name: 'test.png',
      mimeType: 'image/png',
      buffer: Buffer.from(testImageData.split(',')[1], 'base64')
    });
    
    await page.waitForTimeout(1000);

    // Add text
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    console.log('\n=== Testing Export at Different Zoom Levels ===\n');

    // Test 1: Export at default zoom (1x)
    console.log('1. Default zoom (1x):');
    const download1Promise = page.waitForEvent('download');
    await page.click('button:has-text("Export PNG")');
    const download1 = await download1Promise;
    const path1 = await download1.path();
    if (path1) {
      const stat1 = await page.evaluate(async (dataUrl) => {
        // Create an image to get dimensions
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            resolve({ width: img.width, height: img.height });
          };
          // Read the downloaded file would require fs access, so we'll check canvas state
          resolve({ width: 0, height: 0 });
        });
      }, '');
      console.log(`   File size: ${(await require('fs').promises.stat(path1)).size} bytes`);
    }

    // Test 2: Zoom in and export
    console.log('\n2. Zoomed in (2x):');
    const zoomInBtn = page.locator('button[title="Zoom in (Ctrl++)"]');
    for (let i = 0; i < 4; i++) {
      await zoomInBtn.click();
      await page.waitForTimeout(100);
    }
    
    // Check current zoom level
    const zoomLevel2 = await page.evaluate(() => (window as any).canvas?.getZoom());
    console.log(`   Current zoom: ${zoomLevel2?.toFixed(2)}x`);
    
    const download2Promise = page.waitForEvent('download');
    await page.click('button:has-text("Export PNG")');
    const download2 = await download2Promise;
    const path2 = await download2.path();
    if (path2) {
      console.log(`   File size: ${(await require('fs').promises.stat(path2)).size} bytes`);
    }

    // Test 3: Zoom out and export
    console.log('\n3. Zoomed out (0.5x):');
    const zoomOutBtn = page.locator('button[title="Zoom out (Ctrl+-)"]');
    for (let i = 0; i < 8; i++) {
      await zoomOutBtn.click();
      await page.waitForTimeout(100);
    }
    
    const zoomLevel3 = await page.evaluate(() => (window as any).canvas?.getZoom());
    console.log(`   Current zoom: ${zoomLevel3?.toFixed(2)}x`);
    
    const download3Promise = page.waitForEvent('download');
    await page.click('button:has-text("Export PNG")');
    const download3 = await download3Promise;
    const path3 = await download3.path();
    if (path3) {
      console.log(`   File size: ${(await require('fs').promises.stat(path3)).size} bytes`);
    }

    // Test 4: Pan and export
    console.log('\n4. After panning:');
    await page.keyboard.down('Alt');
    await page.mouse.move(300, 300);
    await page.mouse.down();
    await page.mouse.move(100, 100);
    await page.mouse.up();
    await page.keyboard.up('Alt');
    await page.waitForTimeout(500);
    
    const download4Promise = page.waitForEvent('download');
    await page.click('button:has-text("Export PNG")');
    const download4 = await download4Promise;
    const path4 = await download4.path();
    if (path4) {
      console.log(`   File size: ${(await require('fs').promises.stat(path4)).size} bytes`);
    }

    // Check what's happening in the export function
    const exportInfo = await page.evaluate(() => {
      const canvas = (window as any).canvas;
      if (!canvas) return null;
      
      const store = (window as any).useEditorStore?.getState();
      return {
        currentZoom: canvas.getZoom(),
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        originalWidth: store?.originalImageWidth,
        originalHeight: store?.originalImageHeight,
        viewportTransform: canvas.viewportTransform
      };
    });
    
    console.log('\n=== Canvas State ===');
    console.log('Export info:', exportInfo);
    
    // All files should exist
    expect(path1).toBeTruthy();
    expect(path2).toBeTruthy();
    expect(path3).toBeTruthy();
    expect(path4).toBeTruthy();
  });
});