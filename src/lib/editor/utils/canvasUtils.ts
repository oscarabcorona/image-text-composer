import { Canvas, Line, Object as FabricObject } from 'fabric';
import { EDITOR_CONSTANTS } from '../constants';

/**
 * Calculate scale to fit image within bounds
 * DRY: Extracted repeated scaling logic
 */
export function calculateImageScale(
  imageWidth: number,
  imageHeight: number,
  maxWidth: number,
  maxHeight: number
): number {
  if (imageWidth <= maxWidth && imageHeight <= maxHeight) {
    return 1;
  }
  
  const scaleX = maxWidth / imageWidth;
  const scaleY = maxHeight / imageHeight;
  return Math.min(scaleX, scaleY);
}

/**
 * Create snap guidelines for centering
 */
export function createCenterLine(
  direction: 'horizontal' | 'vertical',
  canvasWidth: number,
  canvasHeight: number
): Line {
  const coords: [number, number, number, number] = direction === 'horizontal'
    ? [canvasWidth / 2, 0, canvasWidth / 2, canvasHeight]
    : [0, canvasHeight / 2, canvasWidth, canvasHeight / 2];

  return new Line(coords, {
    stroke: EDITOR_CONSTANTS.SNAP.CENTER_LINE_COLOR,
    strokeWidth: EDITOR_CONSTANTS.SNAP.CENTER_LINE_WIDTH,
    selectable: false,
    evented: false,
  });
}

/**
 * Check if object is near center
 * DRY: Extracted snap detection logic
 */
export function isNearCenter(
  objectCenter: number,
  canvasCenter: number,
  threshold: number = EDITOR_CONSTANTS.SNAP.THRESHOLD
): boolean {
  return Math.abs(objectCenter - canvasCenter) < threshold;
}

/**
 * Calculate object center position
 */
export function getObjectCenter(object: FabricObject): { x: number; y: number } {
  const width = (object.width || 0) * (object.scaleX || 1);
  const height = (object.height || 0) * (object.scaleY || 1);
  
  return {
    x: (object.left || 0) + width / 2,
    y: (object.top || 0) + height / 2,
  };
}

/**
 * Set object position from center
 */
export function setObjectCenterPosition(
  object: FabricObject,
  centerX: number,
  centerY: number
): void {
  const width = (object.width || 0) * (object.scaleX || 1);
  const height = (object.height || 0) * (object.scaleY || 1);
  
  object.set({
    left: centerX - width / 2,
    top: centerY - height / 2,
  });
}

/**
 * Safe canvas render with error handling
 */
export function safeRender(canvas: Canvas | null): void {
  if (!canvas) return;
  
  try {
    canvas.renderAll();
  } catch (error) {
    console.error('Canvas render error:', error);
  }
}