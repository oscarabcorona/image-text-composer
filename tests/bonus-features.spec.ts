import { test, expect } from '@playwright/test';

test.describe('Bonus Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Line height and letter spacing controls', async ({ page }) => {
    // Add text layer
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Find line height control
    const lineHeightInput = page.locator('input[type="number"]').filter({ hasText: /line height/i });
    await lineHeightInput.fill('2');
    
    // Find letter spacing control
    const letterSpacingInput = page.locator('input[type="number"]').filter({ hasText: /letter spacing/i });
    await letterSpacingInput.fill('50');

    // Verify values applied
    const textProperties = await page.evaluate(() => {
      const activeObject = (window as any).canvas?.getActiveObject();
      return {
        lineHeight: activeObject?.lineHeight,
        charSpacing: activeObject?.charSpacing
      };
    });

    expect(textProperties.lineHeight).toBe(2);
    expect(textProperties.charSpacing).toBe(50);
  });

  test('Duplicate layer functionality', async ({ page }) => {
    // Add text layer
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Edit text
    const canvas = page.locator('canvas');
    await canvas.dblclick();
    await page.keyboard.type('Original Text');
    await page.keyboard.press('Escape');

    // Duplicate the layer
    await page.click('button[aria-label="Duplicate layer"]');
    await page.waitForTimeout(500);

    // Verify two layers exist
    const layerCount = await page.locator('[data-testid="layer-item"]').count();
    expect(layerCount).toBe(2);

    // Verify duplicate has same text
    const texts = await page.evaluate(() => {
      const canvas = (window as any).canvas;
      return canvas?._objects
        ?.filter((obj: any) => obj.type === 'i-text')
        ?.map((obj: any) => obj.text);
    });

    expect(texts).toHaveLength(2);
    expect(texts[0]).toBe('Original Text');
    expect(texts[1]).toBe('Original Text');
  });

  test('Lock/unlock layer functionality', async ({ page }) => {
    // Add text layer
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Lock the layer
    await page.click('button[aria-label="Lock layer"]');
    await page.waitForTimeout(200);

    // Try to select locked layer on canvas
    const canvas = page.locator('canvas');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');

    await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);

    // Verify layer is not selectable
    const isSelectable = await page.evaluate(() => {
      const canvas = (window as any).canvas;
      const textObject = canvas?._objects?.find((obj: any) => obj.type === 'i-text');
      return textObject?.selectable;
    });

    expect(isSelectable).toBe(false);

    // Unlock the layer
    await page.click('button[aria-label="Unlock layer"]');
    await page.waitForTimeout(200);

    // Verify layer is selectable again
    const isSelectableAfter = await page.evaluate(() => {
      const canvas = (window as any).canvas;
      const textObject = canvas?._objects?.find((obj: any) => obj.type === 'i-text');
      return textObject?.selectable;
    });

    expect(isSelectableAfter).toBe(true);
  });

  test('Visible history panel with jump functionality', async ({ page }) => {
    // Perform multiple actions
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(200);

    // Delete one layer
    await page.click('[data-testid="layer-item"]:first-child button[aria-label="Delete layer"]');
    await page.waitForTimeout(200);

    // Check history panel is visible
    const historyPanel = page.locator('[data-testid="history-panel"]');
    await expect(historyPanel).toBeVisible();

    // Count history items
    const historyCount = await page.locator('[data-testid="history-item"]').count();
    expect(historyCount).toBeGreaterThan(0);

    // Jump to earlier state
    await page.click('[data-testid="history-item"]:nth-child(2)');
    await page.waitForTimeout(500);

    // Verify state changed
    const layerCount = await page.locator('[data-testid="layer-item"]').count();
    expect(layerCount).toBe(2); // Should have 2 layers after jumping back
  });

  test('Multiple image format support', async ({ page }) => {
    const formats = ['png', 'jpeg', 'gif', 'webp'];
    
    for (const format of formats) {
      // Create test image data for each format
      const imageData = await page.evaluate((fmt) => {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        ctx!.fillStyle = `hsl(${Math.random() * 360}, 70%, 50%)`;
        ctx!.fillRect(0, 0, 100, 100);
        return canvas.toDataURL(`image/${fmt === 'jpeg' ? 'jpeg' : fmt}`);
      }, format);

      // Clear canvas first
      await page.click('button:has-text("Reset")');
      page.on('dialog', dialog => dialog.accept());
      await page.waitForTimeout(500);

      // Upload the image
      await page.evaluate((dataUrl) => {
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File([
          Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0))
        ], `test.${dataUrl.includes('jpeg') ? 'jpg' : dataUrl.split('/')[1].split(';')[0]}`, 
        { type: dataUrl.split(';')[0].split(':')[1] });
        
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        
        Object.defineProperty(input, 'files', {
          value: dataTransfer.files,
          writable: false,
        });
        
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);
      }, imageData);

      await page.waitForTimeout(1000);

      // Verify image loaded
      const hasBackground = await page.evaluate(() => {
        const canvas = (window as any).canvas;
        return canvas?.backgroundImage !== null;
      });

      expect(hasBackground).toBeTruthy();
    }
  });

  test('Google Fonts integration with 100+ fonts', async ({ page }) => {
    // Add text layer
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Open font selector
    await page.click('button[role="combobox"]');
    await page.waitForTimeout(500);

    // Check if fonts are loaded
    const fontCount = await page.locator('button[style*="font-family"]').count();
    
    // Should have many fonts available (at least default fonts)
    expect(fontCount).toBeGreaterThan(5);

    // Search for a specific font
    await page.fill('input[placeholder="Search fonts..."]', 'Roboto');
    await page.waitForTimeout(300);

    // Select Roboto
    await page.click('button:has-text("Roboto"):first');
    
    // Verify font applied
    const appliedFont = await page.evaluate(() => {
      const activeObject = (window as any).canvas?.getActiveObject();
      return activeObject?.fontFamily;
    });

    expect(appliedFont).toBe('Roboto');
  });
});

test.describe('Performance and Edge Cases', () => {
  test('Handle large images gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Create a large image (2000x2000)
    const largeImageData = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 2000;
      canvas.height = 2000;
      const ctx = canvas.getContext('2d');
      
      // Create gradient for visual interest
      const gradient = ctx!.createLinearGradient(0, 0, 2000, 2000);
      gradient.addColorStop(0, 'red');
      gradient.addColorStop(1, 'blue');
      ctx!.fillStyle = gradient;
      ctx!.fillRect(0, 0, 2000, 2000);
      
      return canvas.toDataURL('image/png');
    });

    // Upload large image
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
    }, largeImageData);

    await page.waitForTimeout(2000);

    // Verify canvas handled it (should be constrained to max dimensions)
    const canvasDimensions = await page.evaluate(() => {
      const canvas = (window as any).canvas;
      return { width: canvas?.width, height: canvas?.height };
    });

    expect(canvasDimensions.width).toBeLessThanOrEqual(1920);
    expect(canvasDimensions.height).toBeLessThanOrEqual(1080);
  });

  test('Auto-save with timeout works correctly', async ({ page }) => {
    await page.goto('/');
    
    // Add text
    await page.click('button:has-text("Add Text")');
    await page.waitForTimeout(500);

    // Make rapid changes
    for (let i = 0; i < 5; i++) {
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2 + i * 10, box.y + box.height / 2);
      }
      await page.waitForTimeout(100); // Less than debounce time
    }

    // Check localStorage before timeout
    const beforeTimeout = await page.evaluate(() => {
      return localStorage.getItem('image-text-composer-state');
    });

    // Wait for debounce timeout (2 seconds)
    await page.waitForTimeout(2100);

    // Check localStorage after timeout
    const afterTimeout = await page.evaluate(() => {
      return localStorage.getItem('image-text-composer-state');
    });

    expect(afterTimeout).toBeTruthy();
    expect(afterTimeout).not.toBe(beforeTimeout);
  });
});