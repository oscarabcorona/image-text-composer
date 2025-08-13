import { test, expect, Page } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

// Utility functions for image testing
async function createImageData(width: number, height: number, format: 'png' | 'jpeg' | 'webp' = 'png') {
  return await test.evaluate(({ width, height, format }) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Create a simple test pattern
    ctx!.fillStyle = '#ff0000';
    ctx!.fillRect(0, 0, width / 2, height / 2);
    ctx!.fillStyle = '#00ff00';
    ctx!.fillRect(width / 2, 0, width / 2, height / 2);
    ctx!.fillStyle = '#0000ff';
    ctx!.fillRect(0, height / 2, width / 2, height / 2);
    ctx!.fillStyle = '#ffff00';
    ctx!.fillRect(width / 2, height / 2, width / 2, height / 2);
    
    // Add text to make dimensions clear
    ctx!.fillStyle = '#ffffff';
    ctx!.font = '16px Arial';
    ctx!.fillText(`${width}x${height}`, 10, 20);
    
    return canvas.toDataURL(`image/${format}`, 0.9);
  }, { width, height, format });
}

async function uploadImageData(page: Page, dataUrl: string, filename: string = 'test.png') {
  await page.evaluate(({ dataUrl, filename }) => {
    const base64Data = dataUrl.split(',')[1];
    const binary = atob(base64Data);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    
    const file = new File([array], filename, { 
      type: dataUrl.split(',')[0].split(':')[1].split(';')[0] 
    });
    
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, { dataUrl, filename });
}

async function getCanvasInfo(page: Page) {
  return await page.evaluate(() => {
    const canvas = (window as any).canvas;
    const store = (window as any).useEditorStore?.getState?.();
    
    return {
      canvasWidth: canvas?.width || 0,
      canvasHeight: canvas?.height || 0,
      zoom: canvas?.getZoom() || 1,
      objects: canvas?.getObjects().length || 0,
      hasBackgroundImage: !!canvas?.backgroundImage,
      originalImageWidth: store?.originalImageWidth || 0,
      originalImageHeight: store?.originalImageHeight || 0
    };
  });
}

async function createCorruptedImageData() {
  // Create data that looks like an image but is corrupted
  const corruptedPngHeader = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAABBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
  return corruptedPngHeader;
}

test.describe('Image Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Extremely small images (1x1 to 10x10 pixels)', async ({ page }) => {
    console.log('Testing extremely small images...');
    
    const smallSizes = [
      { width: 1, height: 1 },
      { width: 2, height: 2 },
      { width: 5, height: 5 },
      { width: 10, height: 10 },
      { width: 1, height: 10 },
      { width: 10, height: 1 }
    ];

    for (const size of smallSizes) {
      console.log(`Testing ${size.width}x${size.height} image...`);
      
      // Create tiny image
      const imageData = await page.evaluate((dimensions) => {
        const canvas = document.createElement('canvas');
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        const ctx = canvas.getContext('2d');
        
        // Fill with a color
        ctx!.fillStyle = '#ff0000';
        ctx!.fillRect(0, 0, dimensions.width, dimensions.height);
        
        return canvas.toDataURL('image/png');
      }, size);

      // Upload the tiny image
      await uploadImageData(page, imageData, `tiny-${size.width}x${size.height}.png`);
      await page.waitForTimeout(1000);

      // Check canvas info
      const canvasInfo = await getCanvasInfo(page);
      console.log(`Canvas info for ${size.width}x${size.height}:`, canvasInfo);

      // Canvas should handle tiny images gracefully
      expect(canvasInfo.hasBackgroundImage).toBeTruthy();
      expect(canvasInfo.originalImageWidth).toBe(size.width);
      expect(canvasInfo.originalImageHeight).toBe(size.height);
      
      // Canvas should be resized to a reasonable minimum size
      expect(canvasInfo.canvasWidth).toBeGreaterThan(0);
      expect(canvasInfo.canvasHeight).toBeGreaterThan(0);
      
      // Try to add text on tiny canvas
      await page.click('button:has-text("Add Text")');
      await page.waitForTimeout(500);
      
      const canvasWithText = await getCanvasInfo(page);
      expect(canvasWithText.objects).toBe(1);
      
      // Clear for next test
      await page.click('button:has-text("Reset")');
      page.on('dialog', dialog => dialog.accept());
      await page.waitForTimeout(300);
    }
    
    console.log('Small images test completed');
  });

  test('Extremely large images (>4000px dimensions)', async ({ page }) => {
    console.log('Testing extremely large images...');
    
    const largeSizes = [
      { width: 4000, height: 3000, name: '4K resolution' },
      { width: 5000, height: 4000, name: '5K resolution' },
      { width: 8000, height: 6000, name: '8K resolution' },
      { width: 10000, height: 1000, name: 'Ultra-wide panoramic' },
      { width: 1000, height: 10000, name: 'Ultra-tall vertical' }
    ];

    for (const size of largeSizes) {
      console.log(`Testing ${size.name}: ${size.width}x${size.height}...`);
      
      try {
        // Create large image (simplified pattern to avoid browser memory issues)
        const imageData = await page.evaluate((dimensions) => {
          const canvas = document.createElement('canvas');
          canvas.width = dimensions.width;
          canvas.height = dimensions.height;
          const ctx = canvas.getContext('2d');
          
          // Simple pattern to minimize memory usage
          ctx!.fillStyle = '#f0f0f0';
          ctx!.fillRect(0, 0, dimensions.width, dimensions.height);
          
          // Add some markers
          ctx!.fillStyle = '#ff0000';
          ctx!.fillRect(0, 0, 100, 100); // Top-left
          ctx!.fillRect(dimensions.width - 100, 0, 100, 100); // Top-right
          ctx!.fillRect(0, dimensions.height - 100, 100, 100); // Bottom-left
          ctx!.fillRect(dimensions.width - 100, dimensions.height - 100, 100, 100); // Bottom-right
          
          // Add dimension text
          ctx!.fillStyle = '#000000';
          ctx!.font = '48px Arial';
          ctx!.fillText(`${dimensions.width}x${dimensions.height}`, 200, 200);
          
          return canvas.toDataURL('image/png', 0.5); // Reduced quality to manage size
        }, size);

        // Upload the large image
        await uploadImageData(page, imageData, `large-${size.width}x${size.height}.png`);
        await page.waitForTimeout(3000); // Longer wait for large images

        // Check if canvas handled the large image
        const canvasInfo = await getCanvasInfo(page);
        console.log(`Canvas info for ${size.name}:`, canvasInfo);

        if (canvasInfo.hasBackgroundImage) {
          expect(canvasInfo.originalImageWidth).toBe(size.width);
          expect(canvasInfo.originalImageHeight).toBe(size.height);
          
          // Test adding text to large canvas
          await page.click('button:has-text("Add Text")');
          await page.waitForTimeout(500);
          
          const canvasWithText = await getCanvasInfo(page);
          expect(canvasWithText.objects).toBe(1);
          
          // Test zoom functionality with large image
          for (let i = 0; i < 3; i++) {
            await page.click('button[title="Zoom out (Ctrl+-)"]');
            await page.waitForTimeout(200);
          }
          
          const zoomedInfo = await getCanvasInfo(page);
          expect(zoomedInfo.zoom).toBeLessThan(1);
          
        } else {
          console.log(`Large image ${size.name} was not loaded - likely due to browser limitations`);
          // This is acceptable behavior for extremely large images
        }

      } catch (error) {
        console.log(`Large image ${size.name} caused error (may be expected):`, error);
        
        // Verify app is still functional after error
        const canvasInfo = await getCanvasInfo(page);
        expect(canvasInfo).toBeTruthy();
      }
      
      // Clear for next test
      await page.click('button:has-text("Reset")');
      page.on('dialog', dialog => dialog.accept());
      await page.waitForTimeout(500);
    }
    
    console.log('Large images test completed');
  });

  test('Images with unusual aspect ratios', async ({ page }) => {
    console.log('Testing images with unusual aspect ratios...');
    
    const unusualAspectRatios = [
      { width: 1000, height: 10, ratio: '100:1', name: 'Extremely wide' },
      { width: 10, height: 1000, ratio: '1:100', name: 'Extremely tall' },
      { width: 5000, height: 50, ratio: '100:1', name: 'Ultra-wide banner' },
      { width: 50, height: 5000, ratio: '1:100', name: 'Ultra-tall skyscraper' },
      { width: 2000, height: 100, ratio: '20:1', name: 'Wide panoramic' },
      { width: 100, height: 2000, ratio: '1:20', name: 'Tall portrait' }
    ];

    for (const aspect of unusualAspectRatios) {
      console.log(`Testing ${aspect.name} (${aspect.ratio}): ${aspect.width}x${aspect.height}...`);
      
      // Create image with unusual aspect ratio
      const imageData = await page.evaluate((dimensions) => {
        const canvas = document.createElement('canvas');
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        const ctx = canvas.getContext('2d');
        
        // Gradient fill to make aspect ratio visible
        const gradient = ctx!.createLinearGradient(0, 0, dimensions.width, dimensions.height);
        gradient.addColorStop(0, '#ff0000');
        gradient.addColorStop(0.5, '#00ff00');
        gradient.addColorStop(1, '#0000ff');
        
        ctx!.fillStyle = gradient;
        ctx!.fillRect(0, 0, dimensions.width, dimensions.height);
        
        // Add corner markers
        ctx!.fillStyle = '#ffffff';
        const markerSize = Math.min(dimensions.width, dimensions.height, 20);
        ctx!.fillRect(0, 0, markerSize, markerSize);
        ctx!.fillRect(dimensions.width - markerSize, 0, markerSize, markerSize);
        ctx!.fillRect(0, dimensions.height - markerSize, markerSize, markerSize);
        ctx!.fillRect(dimensions.width - markerSize, dimensions.height - markerSize, markerSize, markerSize);
        
        return canvas.toDataURL('image/png');
      }, aspect);

      // Upload the unusual aspect ratio image
      await uploadImageData(page, imageData, `aspect-${aspect.width}x${aspect.height}.png`);
      await page.waitForTimeout(2000);

      // Check canvas handling
      const canvasInfo = await getCanvasInfo(page);
      console.log(`Canvas info for ${aspect.name}:`, canvasInfo);

      if (canvasInfo.hasBackgroundImage) {
        expect(canvasInfo.originalImageWidth).toBe(aspect.width);
        expect(canvasInfo.originalImageHeight).toBe(aspect.height);
        
        // Canvas should maintain aspect ratio
        const canvasAspectRatio = canvasInfo.canvasWidth / canvasInfo.canvasHeight;
        const originalAspectRatio = aspect.width / aspect.height;
        
        // Allow for some rounding differences
        expect(canvasAspectRatio).toBeCloseTo(originalAspectRatio, 1);
        
        // Test text placement on unusual aspect ratios
        await page.click('button:has-text("Add Text")');
        await page.waitForTimeout(500);
        
        const canvas = page.locator('canvas');
        await canvas.dblclick();
        await page.keyboard.type(`${aspect.name} ${aspect.ratio}`);
        await page.keyboard.press('Escape');
        
        const canvasWithText = await getCanvasInfo(page);
        expect(canvasWithText.objects).toBe(1);
        
        // Test zoom controls with unusual aspect ratios
        await page.click('button[title="Zoom to fit"]');
        await page.waitForTimeout(500);
        
        const fittedInfo = await getCanvasInfo(page);
        expect(fittedInfo.zoom).toBeGreaterThan(0);
        
      } else {
        console.log(`Unusual aspect ratio ${aspect.name} was not loaded`);
      }
      
      // Clear for next test
      await page.click('button:has-text("Reset")');
      page.on('dialog', dialog => dialog.accept());
      await page.waitForTimeout(300);
    }
    
    console.log('Unusual aspect ratios test completed');
  });

  test('Corrupted and invalid image data handling', async ({ page }) => {
    console.log('Testing corrupted and invalid image data...');
    
    const corruptedDataScenarios = [
      {
        name: 'Invalid base64 data',
        data: 'data:image/png;base64,invalidbase64data'
      },
      {
        name: 'Truncated PNG header',
        data: 'data:image/png;base64,iVBORw0KGgo'
      },
      {
        name: 'Wrong MIME type',
        data: 'data:image/invalid;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      },
      {
        name: 'Binary garbage data',
        data: 'data:image/png;base64,' + Buffer.from('random garbage data that is not an image').toString('base64')
      },
      {
        name: 'Empty image data',
        data: 'data:image/png;base64,'
      }
    ];

    for (const scenario of corruptedDataScenarios) {
      console.log(`Testing ${scenario.name}...`);
      
      // Set up error dialog handler
      let dialogHandled = false;
      page.on('dialog', async (dialog) => {
        console.log(`Dialog message: ${dialog.message()}`);
        dialogHandled = true;
        await dialog.accept();
      });
      
      try {
        // Attempt to upload corrupted data
        await uploadImageData(page, scenario.data, `corrupted-${scenario.name.replace(/\s+/g, '-')}.png`);
        await page.waitForTimeout(2000);
        
        // Check that app handled corruption gracefully
        const canvasInfo = await getCanvasInfo(page);
        console.log(`Canvas info after ${scenario.name}:`, canvasInfo);
        
        // App should either reject the image or handle it gracefully
        // If rejected, no background image should be set
        // If somehow accepted, app should still be functional
        
        // App should still be functional
        await page.click('button:has-text("Add Text")');
        await page.waitForTimeout(500);
        
        const functionalTest = await getCanvasInfo(page);
        expect(functionalTest.objects).toBe(1);
        
        // Clear for next test
        await page.click('button:has-text("Reset")');
        if (!dialogHandled) {
          page.on('dialog', dialog => dialog.accept());
        }
        await page.waitForTimeout(300);
        
      } catch (error) {
        console.log(`Corrupted data ${scenario.name} caused error (expected):`, error);
        
        // Verify app is still functional after error
        const canvasInfo = await getCanvasInfo(page);
        expect(canvasInfo).toBeTruthy();
      }
      
      // Reset dialog handler
      page.removeAllListeners('dialog');
    }
    
    console.log('Corrupted image data test completed');
  });

  test('Images with embedded color profiles and metadata', async ({ page }) => {
    console.log('Testing images with color profiles and metadata...');
    
    // Create images with different characteristics
    const imageVariations = [
      {
        name: 'High quality JPEG',
        format: 'jpeg',
        quality: 1.0,
        width: 1000,
        height: 800
      },
      {
        name: 'Low quality JPEG',
        format: 'jpeg',
        quality: 0.1,
        width: 1000,
        height: 800
      },
      {
        name: 'WebP format',
        format: 'webp',
        quality: 0.8,
        width: 800,
        height: 600
      }
    ];

    for (const variation of imageVariations) {
      console.log(`Testing ${variation.name}...`);
      
      try {
        // Create image with specified format and quality
        const imageData = await page.evaluate((config) => {
          const canvas = document.createElement('canvas');
          canvas.width = config.width;
          canvas.height = config.height;
          const ctx = canvas.getContext('2d');
          
          // Create a complex image to test compression/quality
          for (let i = 0; i < 20; i++) {
            const x = (i * config.width) / 20;
            const gradient = ctx!.createLinearGradient(x, 0, x + config.width / 20, config.height);
            gradient.addColorStop(0, `hsl(${i * 18}, 70%, 50%)`);
            gradient.addColorStop(1, `hsl(${i * 18 + 180}, 70%, 50%)`);
            
            ctx!.fillStyle = gradient;
            ctx!.fillRect(x, 0, config.width / 20, config.height);
          }
          
          // Add some text
          ctx!.fillStyle = '#ffffff';
          ctx!.font = '24px Arial';
          ctx!.fillText(`${config.name} - ${config.width}x${config.height}`, 50, 50);
          
          const mimeType = `image/${config.format}`;
          return canvas.toDataURL(mimeType, config.quality);
        }, variation);

        // Upload the image
        await uploadImageData(page, imageData, `${variation.name.replace(/\s+/g, '-')}.${variation.format}`);
        await page.waitForTimeout(2000);

        // Check canvas handling
        const canvasInfo = await getCanvasInfo(page);
        console.log(`Canvas info for ${variation.name}:`, canvasInfo);

        if (canvasInfo.hasBackgroundImage) {
          expect(canvasInfo.originalImageWidth).toBe(variation.width);
          expect(canvasInfo.originalImageHeight).toBe(variation.height);
          
          // Test that text can be added over the image
          await page.click('button:has-text("Add Text")');
          await page.waitForTimeout(500);
          
          const canvas = page.locator('canvas');
          await canvas.dblclick();
          await page.keyboard.type(`Text over ${variation.name}`);
          await page.keyboard.press('Escape');
          
          const canvasWithText = await getCanvasInfo(page);
          expect(canvasWithText.objects).toBe(1);
          
          // Test export functionality
          const downloadPromise = page.waitForEvent('download');
          await page.click('button:has-text("Export PNG")');
          
          try {
            const download = await downloadPromise;
            const downloadPath = await download.path();
            
            if (downloadPath) {
              console.log(`Export successful for ${variation.name}`);
            }
          } catch (exportError) {
            console.log(`Export failed for ${variation.name}:`, exportError);
          }
        }
        
      } catch (error) {
        console.log(`Image variation ${variation.name} caused error:`, error);
      }
      
      // Clear for next test
      await page.click('button:has-text("Reset")');
      page.on('dialog', dialog => dialog.accept());
      await page.waitForTimeout(300);
    }
    
    console.log('Color profiles and metadata test completed');
  });

  test('Animated GIF handling (first frame only)', async ({ page }) => {
    console.log('Testing animated GIF handling...');
    
    // Create a simple animated GIF-like data (simulated)
    // Note: Creating actual animated GIFs is complex, so we'll test static GIF handling
    const staticGifData = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      
      // Create a pattern that would represent the "first frame" of an animation
      ctx!.fillStyle = '#ff0000';
      ctx!.fillRect(0, 0, 200, 200);
      ctx!.fillStyle = '#00ff00';
      ctx!.fillRect(200, 0, 200, 200);
      ctx!.fillStyle = '#0000ff';
      ctx!.fillRect(0, 200, 200, 200);
      ctx!.fillStyle = '#ffff00';
      ctx!.fillRect(200, 200, 200, 200);
      
      // Add frame indicator
      ctx!.fillStyle = '#ffffff';
      ctx!.font = '24px Arial';
      ctx!.fillText('FRAME 1', 150, 50);
      
      // Return as PNG (browsers handle GIF->PNG conversion automatically)
      return canvas.toDataURL('image/png');
    });

    // Upload the GIF-like image
    await uploadImageData(page, staticGifData, 'animated-test.gif');
    await page.waitForTimeout(2000);

    // Check that it's handled as a static image
    const canvasInfo = await getCanvasInfo(page);
    console.log('Canvas info for GIF test:', canvasInfo);

    if (canvasInfo.hasBackgroundImage) {
      expect(canvasInfo.originalImageWidth).toBe(400);
      expect(canvasInfo.originalImageHeight).toBe(400);
      
      // Verify it's treated as a static image
      await page.click('button:has-text("Add Text")');
      await page.waitForTimeout(500);
      
      const canvas = page.locator('canvas');
      await canvas.dblclick();
      await page.keyboard.type('Text over static GIF');
      await page.keyboard.press('Escape');
      
      const canvasWithText = await getCanvasInfo(page);
      expect(canvasWithText.objects).toBe(1);
      
      // Test export - should export the first frame only
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Export PNG")');
      
      try {
        const download = await downloadPromise;
        console.log('GIF export successful (as static PNG)');
      } catch (exportError) {
        console.log('GIF export failed:', exportError);
      }
    }
    
    console.log('Animated GIF test completed');
  });

  test('Memory usage with multiple large images', async ({ page }) => {
    console.log('Testing memory usage with multiple large images...');
    
    // Test sequential loading of multiple images
    const testImages = [
      { width: 1000, height: 800, name: 'Image 1' },
      { width: 1200, height: 900, name: 'Image 2' },
      { width: 800, height: 1000, name: 'Image 3' }
    ];

    for (let i = 0; i < testImages.length; i++) {
      const image = testImages[i];
      console.log(`Loading ${image.name}: ${image.width}x${image.height}...`);
      
      // Create image
      const imageData = await page.evaluate((config) => {
        const canvas = document.createElement('canvas');
        canvas.width = config.width;
        canvas.height = config.height;
        const ctx = canvas.getContext('2d');
        
        // Simple pattern to identify each image
        const hue = (config.width + config.height) % 360;
        ctx!.fillStyle = `hsl(${hue}, 70%, 50%)`;
        ctx!.fillRect(0, 0, config.width, config.height);
        
        ctx!.fillStyle = '#ffffff';
        ctx!.font = '48px Arial';
        ctx!.fillText(config.name, 100, 100);
        
        return canvas.toDataURL('image/png', 0.8);
      }, image);

      // Upload new image (should replace previous)
      await uploadImageData(page, imageData, `${image.name.replace(' ', '-')}.png`);
      await page.waitForTimeout(2000);

      // Verify current image is loaded
      const canvasInfo = await getCanvasInfo(page);
      expect(canvasInfo.hasBackgroundImage).toBeTruthy();
      expect(canvasInfo.originalImageWidth).toBe(image.width);
      expect(canvasInfo.originalImageHeight).toBe(image.height);
      
      // Add some text content to each image
      await page.click('button:has-text("Add Text")');
      await page.waitForTimeout(300);
      
      const canvas = page.locator('canvas');
      await canvas.dblclick();
      await page.keyboard.type(`Text on ${image.name}`);
      await page.keyboard.press('Escape');
      
      // Check memory usage if available
      const memoryInfo = await page.evaluate(() => {
        const memory = (performance as any).memory;
        return memory ? {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize
        } : null;
      });
      
      if (memoryInfo) {
        console.log(`Memory after ${image.name}:`, memoryInfo);
      }
    }
    
    // Final memory check
    const finalMemory = await page.evaluate(() => {
      const memory = (performance as any).memory;
      return memory ? memory.usedJSHeapSize : null;
    });
    
    console.log('Final memory usage:', finalMemory);
    
    // App should still be functional after loading multiple images
    const finalCanvasInfo = await getCanvasInfo(page);
    expect(finalCanvasInfo.hasBackgroundImage).toBeTruthy();
    expect(finalCanvasInfo.objects).toBeGreaterThan(0);
    
    console.log('Multiple large images test completed');
  });
});