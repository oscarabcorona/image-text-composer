import { Canvas, FabricImage, TDataUrlOptions } from 'fabric';
import { ICanvasService } from '@/types/services';
import { EDITOR_CONSTANTS } from '../constants';

export class CanvasService implements ICanvasService {
  private canvas: Canvas | null = null;

  initialize(canvasElement: HTMLCanvasElement): Canvas {
    if (this.canvas) {
      this.canvas.dispose();
    }

    this.canvas = new Canvas(canvasElement, {
      width: EDITOR_CONSTANTS.CANVAS.DEFAULT_WIDTH,
      height: EDITOR_CONSTANTS.CANVAS.DEFAULT_HEIGHT,
      backgroundColor: EDITOR_CONSTANTS.CANVAS.BACKGROUND_COLOR,
      preserveObjectStacking: true,
      selection: true,
      renderOnAddRemove: true,
    });

    return this.canvas;
  }

  setDimensions(width: number, height: number): void {
    if (!this.canvas) throw new Error('Canvas not initialized');
    
    this.canvas.setWidth(width);
    this.canvas.setHeight(height);
    this.canvas.calcOffset();
    this.render();
  }

  async setBackgroundImage(dataUrl: string): Promise<void> {
    if (!this.canvas) throw new Error('Canvas not initialized');
    
    const img = await FabricImage.fromURL(dataUrl);
    
    // Set canvas reference on the image (required for v6)
    img.canvas = this.canvas;
    
    // Only resize if image is larger than current canvas
    const imageWidth = img.width || EDITOR_CONSTANTS.CANVAS.DEFAULT_WIDTH;
    const imageHeight = img.height || EDITOR_CONSTANTS.CANVAS.DEFAULT_HEIGHT;
    
    if (imageWidth > this.canvas.width || imageHeight > this.canvas.height) {
      const newWidth = Math.min(imageWidth, EDITOR_CONSTANTS.CANVAS.MAX_WIDTH);
      const newHeight = Math.min(imageHeight, EDITOR_CONSTANTS.CANVAS.MAX_HEIGHT);
      this.canvas.setWidth(newWidth);
      this.canvas.setHeight(newHeight);
      this.canvas.calcOffset();
    }
    
    this.canvas.backgroundImage = img;
    this.render();
  }

  clear(): void {
    if (!this.canvas) return;
    
    this.canvas.clear();
    this.canvas.backgroundColor = EDITOR_CONSTANTS.CANVAS.BACKGROUND_COLOR;
    this.render();
  }

  render(): void {
    if (!this.canvas) return;
    this.canvas.renderAll();
  }

  toDataURL(options?: Partial<TDataUrlOptions>): string {
    if (!this.canvas) throw new Error('Canvas not initialized');
    
    const defaultOptions: TDataUrlOptions = {
      format: 'png',
      quality: 1,
      multiplier: 1,
    };
    
    return this.canvas.toDataURL({
      ...defaultOptions,
      ...options,
    });
  }

  getCanvas(): Canvas | null {
    return this.canvas;
  }

  dispose(): void {
    if (this.canvas) {
      this.canvas.dispose();
      this.canvas = null;
    }
  }
}