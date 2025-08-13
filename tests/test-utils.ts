import { Page } from '@playwright/test';

// Utility functions for edge case tests

export async function setupBasicTest(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Allow app to fully initialize
}

export async function addTextLayer(page: Page, text?: string) {
  await page.click('button:has-text("Add Text")');
  await page.waitForTimeout(500);
  
  if (text) {
    const canvas = getFabricCanvas(page);
    await canvas.dblclick();
    await page.keyboard.type(text);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  
  return await getCanvasInfo(page);
}

export function getFabricCanvas(page: Page) {
  // Use the upper canvas for interactions (Fabric.js convention)
  return page.locator('canvas[data-fabric="top"]');
}

export async function getCanvasInfo(page: Page) {
  return await page.evaluate(() => {
    const canvas = (window as any).canvas;
    const store = (window as any).useEditorStore?.getState?.();
    
    return {
      canvasWidth: canvas?.width || 0,
      canvasHeight: canvas?.height || 0,
      zoom: canvas?.getZoom() || 1,
      objects: canvas?.getObjects()?.length || 0,
      hasBackgroundImage: !!canvas?.backgroundImage,
      originalImageWidth: store?.originalImageWidth || 0,
      originalImageHeight: store?.originalImageHeight || 0,
      layers: store?.layers?.length || 0
    };
  });
}

export async function getActiveObjectProperties(page: Page) {
  return await page.evaluate(() => {
    const canvas = (window as any).canvas;
    const activeObject = canvas?.getActiveObject();
    if (!activeObject) return null;
    
    return {
      left: activeObject.left,
      top: activeObject.top,
      width: activeObject.width,
      height: activeObject.height,
      angle: activeObject.angle,
      scaleX: activeObject.scaleX,
      scaleY: activeObject.scaleY,
      visible: activeObject.visible
    };
  });
}

export async function setZoomLevel(page: Page, zoomLevel: number) {
  await page.evaluate((zoom) => {
    const canvas = (window as any).canvas;
    if (canvas) {
      canvas.setZoom(zoom);
      canvas.renderAll();
    }
  }, zoomLevel);
}

export async function moveObjectToPosition(page: Page, x: number, y: number) {
  await page.evaluate((coords) => {
    const canvas = (window as any).canvas;
    const activeObject = canvas?.getActiveObject();
    if (activeObject) {
      activeObject.set({ left: coords.x, top: coords.y });
      canvas.renderAll();
    }
  }, { x, y });
}

export async function uploadTestImage(page: Page, width: number = 200, height: number = 150) {
  const testImageData = await page.evaluate(({ width, height }) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx!.fillStyle = '#ff0000';
    ctx!.fillRect(0, 0, width, height);
    ctx!.fillStyle = '#ffffff';
    ctx!.font = '16px Arial';
    ctx!.fillText(`${width}x${height}`, 10, 30);
    return canvas.toDataURL('image/png');
  }, { width, height });

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

  await page.waitForTimeout(1000);
}