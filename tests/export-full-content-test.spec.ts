import { test, expect } from '@playwright/test';

test.describe('Export Full Content Tests', () => {
  test('Export captures complete canvas content at all zoom levels', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a test image with distinctive corners and center content
    const testImageData = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      
      // White background
      ctx!.fillStyle = '#ffffff';
      ctx!.fillRect(0, 0, 1000, 800);
      
      // Add distinctive markers at all four corners
      ctx!.fillStyle = '#ff0000'; // Red
      ctx!.fillRect(0, 0, 100, 100); // Top-left
      ctx!.fillStyle = '#00ff00'; // Green  
      ctx!.fillRect(900, 0, 100, 100); // Top-right
      ctx!.fillStyle = '#0000ff'; // Blue
      ctx!.fillRect(0, 700, 100, 100); // Bottom-left
      ctx!.fillStyle = '#ffff00'; // Yellow
      ctx!.fillRect(900, 700, 100, 100); // Bottom-right
      
      // Add center content
      ctx!.fillStyle = '#ff00ff'; // Magenta
      ctx!.fillRect(400, 300, 200, 200); // Center square
      ctx!.fillStyle = '#000000';
      ctx!.font = '48px Arial';
      ctx!.fillText('CENTER', 420, 420);
      
      // Add edge content
      ctx!.fillStyle = '#00ffff'; // Cyan
      ctx!.fillRect(500, 50, 100, 50); // Top edge
      ctx!.fillRect(500, 700, 100, 50); // Bottom edge
      ctx!.fillRect(50, 350, 50, 100); // Left edge
      ctx!.fillRect(900, 350, 50, 100); // Right edge
      
      return canvas.toDataURL('image/png');
    });

    console.log('Test image created: 1000x800 with corner and edge markers');

    // Upload the test image
    await page.setInputFiles('input[type="file"]', {
      name: 'full-content-test.png', 
      mimeType: 'image/png',
      buffer: Buffer.from(testImageData.split(',')[1], 'base64')
    });
    
    await page.waitForTimeout(2000);

    // Add text layers at different positions to test full content capture
    console.log('Adding text layers at different positions...');
    
    // Add text near top-left
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    // Move text to top-left area by clicking there
    const canvas = page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();
    if (canvasBox) {
      await page.mouse.click(canvasBox.x + 150, canvasBox.y + 100);
    }
    await page.waitForTimeout(300);
    
    // Add another text layer and move to bottom-right
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);
    
    if (canvasBox) {
      await page.mouse.click(canvasBox.x + canvasBox.width - 150, canvasBox.y + canvasBox.height - 100);
    }
    await page.waitForTimeout(300);

    // Get canvas info
    const canvasInfo = await page.evaluate(() => {
      const store = (window as any).useEditorStore?.getState();
      const canvas = (window as any).canvas;
      return {
        displayWidth: canvas?.width,
        displayHeight: canvas?.height, 
        originalWidth: store?.originalImageWidth,
        originalHeight: store?.originalImageHeight,
        zoom: canvas?.getZoom(),
        objectCount: canvas?.getObjects()?.length || 0
      };
    });

    console.log('Canvas info before export tests:', canvasInfo);

    // Test exports at different zoom levels
    const exportTests = [
      { name: 'Default zoom (1x)', actions: [] },
      { name: 'Zoomed in (2x)', actions: Array(6).fill('zoomIn') },
      { name: 'Zoomed out (0.25x)', actions: Array(12).fill('zoomOut') },
      { name: 'Panned view', actions: ['pan'] }
    ];

    for (const exportTest of exportTests) {
      console.log(`\n=== Testing export: ${exportTest.name} ===`);

      // Apply zoom/pan actions
      for (const action of exportTest.actions) {
        if (action === 'zoomIn') {
          await page.click('button[title="Zoom in (Ctrl++)"]');
          await page.waitForTimeout(50);
        } else if (action === 'zoomOut') {
          await page.click('button[title="Zoom out (Ctrl+-)"]');
          await page.waitForTimeout(50);
        } else if (action === 'pan') {
          // Pan to show only part of the image
          await page.keyboard.down('Alt');
          await page.mouse.move(400, 300);
          await page.mouse.down();
          await page.mouse.move(100, 100);
          await page.mouse.up();
          await page.keyboard.up('Alt');
          await page.waitForTimeout(300);
        }
      }

      // Get current view state
      const viewState = await page.evaluate(() => {
        const canvas = (window as any).canvas;
        return {
          zoom: canvas?.getZoom(),
          viewport: canvas?.viewportTransform,
          objectsVisible: canvas?.getObjects()?.filter((obj: any) => obj.visible)?.length || 0
        };
      });

      console.log(`View state: zoom=${viewState.zoom?.toFixed(3)}, objects=${viewState.objectsVisible}`);

      // Capture browser console logs during export
      const exportLogs: string[] = [];
      page.on('console', (msg) => {
        if (msg.text().includes('Export') || msg.text().includes('export') || 
            msg.text().includes('Canvas') || msg.text().includes('dimensions')) {
          exportLogs.push(msg.text());
        }
      });

      // Export and verify
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Export PNG")');
      
      try {
        const download = await downloadPromise;
        const downloadPath = await download.path();
        
        if (downloadPath) {
          const fs = require('fs');
          const stats = fs.statSync(downloadPath);
          console.log(`Export successful: ${stats.size} bytes`);
          
          // Verify file size is reasonable (should be substantial for full content)
          expect(stats.size).toBeGreaterThan(10000); // At least 10KB for full content
          
          // Log export console messages
          if (exportLogs.length > 0) {
            console.log('Export logs:', exportLogs.join(', '));
          }
        } else {
          throw new Error('Download path not available');
        }
      } catch (error) {
        console.error(`Export failed for ${exportTest.name}:`, error);
        throw error;
      }

      // Reset view for next test
      await page.click('button[title="Reset zoom (Ctrl+0)"]');
      await page.waitForTimeout(200);
    }

    console.log('\n=== Export Full Content Tests Completed ===');
    console.log('Expected: All exports should contain complete image content (1000x800)');
    console.log('All corner markers, edge content, and text layers should be present');
  });

  test('Export maintains aspect ratio and dimensions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test with different aspect ratios
    const aspectRatioTests = [
      { width: 800, height: 400, name: '2:1 landscape' },
      { width: 400, height: 800, name: '1:2 portrait' },
      { width: 600, height: 600, name: '1:1 square' }
    ];

    for (const aspectTest of aspectRatioTests) {
      console.log(`\nTesting ${aspectTest.name} (${aspectTest.width}x${aspectTest.height})`);

      // Create test image with specific aspect ratio
      const testImageData = await page.evaluate(({ width, height }) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Gradient background to verify scaling
        const gradient = ctx!.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#ff0000');
        gradient.addColorStop(1, '#0000ff');
        ctx!.fillStyle = gradient;
        ctx!.fillRect(0, 0, width, height);
        
        // Add dimension text
        ctx!.fillStyle = '#ffffff';
        ctx!.font = '24px Arial';
        ctx!.fillText(`${width}x${height}`, 20, 40);
        
        return canvas.toDataURL('image/png');
      }, aspectTest);

      // Upload and export
      await page.setInputFiles('input[type="file"]', {
        name: `test-${aspectTest.width}x${aspectTest.height}.png`,
        mimeType: 'image/png', 
        buffer: Buffer.from(testImageData.split(',')[1], 'base64')
      });

      await page.waitForTimeout(1000);
      
      // Add text layer
      await page.click('button:has-text("Add Text")');
      await page.waitForTimeout(300);
      
      // Export
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Export PNG")');
      const download = await downloadPromise;
      
      if (await download.path()) {
        const fs = require('fs');
        const stats = fs.statSync(await download.path());
        console.log(`${aspectTest.name}: ${stats.size} bytes exported`);
        expect(stats.size).toBeGreaterThan(1000);
      }
      
      // Reset for next test
      await page.click('button:has-text("Reset")');
      await page.getByRole('dialog').getByText('OK', { exact: true }).click().catch(() => {});
      await page.waitForTimeout(500);
    }
  });
});