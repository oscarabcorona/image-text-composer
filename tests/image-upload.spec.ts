import { test, expect, Page } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

// Helper to monitor console errors
async function setupErrorMonitoring(page: Page) {
  const errors: string[] = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  
  return errors;
}

// Create test images using base64 data
async function createTestImage(format: 'png' | 'jpeg', fileName: string): Promise<string> {
  // Simple 1x1 pixel images
  const pngData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  const jpegData = Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=', 'base64');
  
  const filePath = path.join(__dirname, fileName);
  await fs.writeFile(filePath, format === 'png' ? pngData : jpegData);
  
  return filePath;
}

test.describe('Image Upload Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Initial page loads without errors', async ({ page }) => {
    const errors = await setupErrorMonitoring(page);
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'tests/screenshots/initial-state.png', fullPage: true });
    
    // Verify upload button exists
    const uploadButton = page.getByRole('button', { name: /upload image/i });
    await expect(uploadButton).toBeVisible();
    
    // Check for any initial errors
    expect(errors).toHaveLength(0);
  });

  test('Upload PNG image successfully', async ({ page }) => {
    const errors = await setupErrorMonitoring(page);
    
    // Create test PNG image
    const pngPath = await createTestImage('png', 'test-image.png');
    
    // Click upload button and select file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /upload image/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(pngPath);
    
    // Wait for potential canvas operations
    await page.waitForTimeout(2000);
    
    // Take screenshot after upload
    await page.screenshot({ path: 'tests/screenshots/after-png-upload.png', fullPage: true });
    
    // Check for the specific Fabric.js error
    const fabricError = errors.find(err => 
      err.includes("Cannot destructure property 'el' of 'this.lower'")
    );
    
    if (fabricError) {
      console.error('Fabric.js error detected:', fabricError);
    }
    
    expect(fabricError).toBeUndefined();
    expect(errors).toHaveLength(0);
    
    // Clean up
    await fs.unlink(pngPath);
  });

  test('Upload JPEG image successfully', async ({ page }) => {
    const errors = await setupErrorMonitoring(page);
    
    // Create test JPEG image
    const jpegPath = await createTestImage('jpeg', 'test-image.jpg');
    
    // Click upload button and select file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /upload image/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(jpegPath);
    
    // Wait for potential canvas operations
    await page.waitForTimeout(2000);
    
    // Take screenshot after upload
    await page.screenshot({ path: 'tests/screenshots/after-jpeg-upload.png', fullPage: true });
    
    // Check for the specific Fabric.js error
    const fabricError = errors.find(err => 
      err.includes("Cannot destructure property 'el' of 'this.lower'")
    );
    
    if (fabricError) {
      console.error('Fabric.js error detected:', fabricError);
    }
    
    expect(fabricError).toBeUndefined();
    expect(errors).toHaveLength(0);
    
    // Clean up
    await fs.unlink(jpegPath);
  });

  test('Upload existing screenshot file', async ({ page }) => {
    const errors = await setupErrorMonitoring(page);
    
    // Use the existing screenshot file
    const screenshotPath = path.join(process.cwd(), 'Screenshot 2025-07-15 at 4.41.28 PM.png');
    
    // Check if file exists
    try {
      await fs.access(screenshotPath);
    } catch {
      console.log('Screenshot file not found, skipping test');
      test.skip();
      return;
    }
    
    // Click upload button and select file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /upload image/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(screenshotPath);
    
    // Wait for potential canvas operations
    await page.waitForTimeout(2000);
    
    // Take screenshot after upload
    await page.screenshot({ path: 'tests/screenshots/after-screenshot-upload.png', fullPage: true });
    
    // Check for the specific Fabric.js error
    const fabricError = errors.find(err => 
      err.includes("Cannot destructure property 'el' of 'this.lower'")
    );
    
    if (fabricError) {
      console.error('Fabric.js error detected:', fabricError);
    }
    
    expect(fabricError).toBeUndefined();
    expect(errors).toHaveLength(0);
  });

  test('Reject invalid file type', async ({ page }) => {
    const errors = await setupErrorMonitoring(page);
    
    // Create a text file
    const txtPath = path.join(__dirname, 'test.txt');
    await fs.writeFile(txtPath, 'This is a text file');
    
    // Set up dialog handler for alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Please upload a valid image file');
      await dialog.accept();
    });
    
    // Click upload button and select file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /upload image/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(txtPath);
    
    // Wait a bit
    await page.waitForTimeout(1000);
    
    // No Fabric.js errors should occur for invalid file
    const fabricError = errors.find(err => 
      err.includes("Cannot destructure property 'el' of 'this.lower'")
    );
    
    expect(fabricError).toBeUndefined();
    
    // Clean up
    await fs.unlink(txtPath);
  });

  test('Add text after image upload', async ({ page }) => {
    const errors = await setupErrorMonitoring(page);
    
    // First upload an image
    const pngPath = await createTestImage('png', 'test-image-text.png');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /upload image/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(pngPath);
    
    await page.waitForTimeout(1000);
    
    // Then add text
    await page.getByRole('button', { name: /add text/i }).click();
    
    await page.waitForTimeout(1000);
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/after-add-text.png', fullPage: true });
    
    // Check for errors
    const fabricError = errors.find(err => 
      err.includes("Cannot destructure property 'el' of 'this.lower'")
    );
    
    expect(fabricError).toBeUndefined();
    expect(errors).toHaveLength(0);
    
    // Clean up
    await fs.unlink(pngPath);
  });
});