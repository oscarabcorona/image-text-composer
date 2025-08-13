import { test, expect } from '@playwright/test';

test.describe('Debug Application State', () => {
  test('Debug application and button states', async ({ page }) => {
    console.log('Navigating to application...');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot of current state
    await page.screenshot({ path: 'debug-current-state.png', fullPage: true });

    // Check page title
    const title = await page.title();
    console.log('Page title:', title);

    // Check all buttons and their states
    const buttons = await page.$$('button');
    console.log(`Found ${buttons.length} buttons`);
    
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const text = await button.textContent();
      const isDisabled = await button.isDisabled();
      const isVisible = await button.isVisible();
      console.log(`Button ${i}: "${text}" - Disabled: ${isDisabled}, Visible: ${isVisible}`);
    }

    // Check for specific button texts
    const uploadButton = page.locator('button:has-text("Upload Image")');
    console.log('Upload Image button exists:', await uploadButton.count() > 0);
    console.log('Upload Image button visible:', await uploadButton.isVisible().catch(() => false));

    const addTextButton = page.locator('button:has-text("Add Text")');
    console.log('Add Text button exists:', await addTextButton.count() > 0);
    console.log('Add Text button visible:', await addTextButton.isVisible().catch(() => false));
    console.log('Add Text button disabled:', await addTextButton.isDisabled().catch(() => 'N/A'));

    // Check if canvas exists
    const canvas = page.locator('canvas');
    console.log('Canvas exists:', await canvas.count() > 0);
    console.log('Canvas visible:', await canvas.isVisible().catch(() => false));

    // Check console errors
    const logs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });
    
    page.on('pageerror', (error) => {
      logs.push(error.message);
    });

    await page.waitForTimeout(1000);
    
    if (logs.length > 0) {
      console.log('Console errors:', logs);
    } else {
      console.log('No console errors detected');
    }

    // Try to enable Add Text button by uploading an image first
    console.log('Trying to upload a test image...');
    
    // Create a simple test image
    const testImageData = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      ctx!.fillStyle = '#ff0000';
      ctx!.fillRect(0, 0, 200, 150);
      ctx!.fillStyle = '#ffffff';
      ctx!.font = '20px Arial';
      ctx!.fillText('Test', 80, 80);
      return canvas.toDataURL('image/png');
    });

    // Upload the test image
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

    await page.waitForTimeout(2000);

    // Check Add Text button state after image upload
    console.log('Add Text button disabled after upload:', await addTextButton.isDisabled().catch(() => 'N/A'));

    // Try clicking Add Text button
    if (await addTextButton.isEnabled()) {
      console.log('Attempting to click Add Text button...');
      await addTextButton.click();
      await page.waitForTimeout(1000);
      
      // Check if layer was added
      const layers = await page.locator('[data-testid="layer-item"]').count();
      console.log('Layers after Add Text:', layers);
    } else {
      console.log('Add Text button is still disabled');
    }

    // Take final screenshot
    await page.screenshot({ path: 'debug-final-state.png', fullPage: true });
  });
});