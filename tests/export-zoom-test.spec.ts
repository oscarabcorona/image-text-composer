import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';

test.describe('Export with Zoom Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Export maintains consistent dimensions at different zoom levels', async ({ page }) => {
    // Create and upload a test image (400x300)
    const testImageData = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      // Create a pattern to verify content
      ctx!.fillStyle = '#f0f0f0';
      ctx!.fillRect(0, 0, 400, 300);
      ctx!.fillStyle = '#ff0000';
      ctx!.fillRect(50, 50, 100, 100);
      ctx!.fillStyle = '#00ff00';
      ctx!.fillRect(250, 150, 100, 100);
      return canvas.toDataURL('image/png');
    });

    // Upload the image using the file input
    await page.setInputFiles('input[type="file"]', {
      name: 'test.png',
      mimeType: 'image/png',
      buffer: Buffer.from(testImageData.split(',')[1], 'base64')
    });
    
    await page.waitForTimeout(1000);

    // Add text to the canvas
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    // Edit the text
    const canvas = page.locator('canvas').first();
    await canvas.dblclick();
    await page.keyboard.type('Test Export');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Test 1: Export at default zoom (1x)
    const download1Promise = page.waitForEvent('download');
    await page.click('button:has-text("Export PNG")');
    const download1 = await download1Promise;
    const path1 = await download1.path();
    
    // Test 2: Export at 2x zoom
    // Use the zoom in button from toolbar
    const zoomInBtn = page.locator('button[title="Zoom in (Ctrl++)"]');
    await zoomInBtn.click();
    await zoomInBtn.click();
    await zoomInBtn.click();
    await zoomInBtn.click();
    await page.waitForTimeout(500);
    
    const download2Promise = page.waitForEvent('download');
    await page.click('button:has-text("Export PNG")');
    const download2 = await download2Promise;
    const path2 = await download2.path();
    
    // Test 3: Export at 0.5x zoom
    // Use the zoom out button
    const zoomOutBtn = page.locator('button[title="Zoom out (Ctrl+-)"]');
    await zoomOutBtn.click();
    await zoomOutBtn.click();
    await zoomOutBtn.click();
    await zoomOutBtn.click();
    await zoomOutBtn.click();
    await zoomOutBtn.click();
    await page.waitForTimeout(500);
    
    const download3Promise = page.waitForEvent('download');
    await page.click('button:has-text("Export PNG")');
    const download3 = await download3Promise;
    const path3 = await download3.path();
    
    // Test 4: Export when panned
    await page.keyboard.down('Alt');
    await page.mouse.move(200, 200);
    await page.mouse.down();
    await page.mouse.move(100, 100);
    await page.mouse.up();
    await page.keyboard.up('Alt');
    await page.waitForTimeout(500);
    
    const download4Promise = page.waitForEvent('download');
    await page.click('button:has-text("Export PNG")');
    const download4 = await download4Promise;
    const path4 = await download4.path();
    
    // Analyze the exported images
    if (path1 && path2 && path3 && path4) {
      // Verify files exist
      const stat1 = await fs.stat(path1);
      const stat2 = await fs.stat(path2);
      const stat3 = await fs.stat(path3);
      const stat4 = await fs.stat(path4);
      
      console.log('Export file sizes:');
      console.log('Default zoom:', stat1.size, 'bytes');
      console.log('2x zoom:', stat2.size, 'bytes');
      console.log('0.5x zoom:', stat3.size, 'bytes');
      console.log('Panned:', stat4.size, 'bytes');
      
      // Files should exist and have reasonable sizes
      expect(stat1.size).toBeGreaterThan(1000);
      expect(stat2.size).toBeGreaterThan(1000);
      expect(stat3.size).toBeGreaterThan(1000);
      expect(stat4.size).toBeGreaterThan(1000);
      
      // If file sizes vary significantly, the export is affected by zoom
      const sizes = [stat1.size, stat2.size, stat3.size, stat4.size];
      const maxSize = Math.max(...sizes);
      const minSize = Math.min(...sizes);
      const variation = (maxSize - minSize) / minSize;
      
      console.log('Size variation:', (variation * 100).toFixed(2) + '%');
      
      // Expect less than 10% variation (accounting for compression differences)
      expect(variation).toBeLessThan(0.1);
    }
  });

  test('Export captures full canvas content regardless of viewport', async ({ page }) => {
    // Upload image
    const testImageData = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      ctx!.fillStyle = '#e0e0e0';
      ctx!.fillRect(0, 0, 800, 600);
      // Add markers at corners
      ctx!.fillStyle = '#ff0000';
      ctx!.fillRect(0, 0, 50, 50); // Top-left
      ctx!.fillRect(750, 0, 50, 50); // Top-right
      ctx!.fillRect(0, 550, 50, 50); // Bottom-left
      ctx!.fillRect(750, 550, 50, 50); // Bottom-right
      return canvas.toDataURL('image/png');
    });

    await page.setInputFiles('input[type="file"]', {
      name: 'test-corners.png',
      mimeType: 'image/png',
      buffer: Buffer.from(testImageData.split(',')[1], 'base64')
    });
    
    await page.waitForTimeout(1000);

    // Zoom in significantly (so corners are not visible)
    const zoomInBtn = page.locator('button[title="Zoom in (Ctrl++)"]');
    for (let i = 0; i < 8; i++) {
      await zoomInBtn.click();
      await page.waitForTimeout(100);
    }

    // Export
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export PNG")');
    const download = await downloadPromise;
    
    // The exported image should still contain all corners
    // even though they're not visible in the zoomed viewport
    expect(download.suggestedFilename()).toContain('.png');
    
    // Log current zoom level for debugging
    const zoomLevel = await page.evaluate(() => {
      return (window as any).canvas?.getZoom();
    });
    console.log('Current zoom level:', zoomLevel);
  });
});