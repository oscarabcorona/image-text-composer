import { TextProperties } from '@/types/editor';
import { EDITOR_CONSTANTS } from '../constants';

/**
 * Validate text properties
 */
export function validateTextProperties(properties: Partial<TextProperties>): TextProperties {
  return {
    fontFamily: properties.fontFamily || EDITOR_CONSTANTS.TEXT.DEFAULT_FONT_FAMILY,
    fontSize: validateFontSize(properties.fontSize),
    fontWeight: validateFontWeight(properties.fontWeight),
    fill: validateColor(properties.fill),
    opacity: validateOpacity(properties.opacity),
    textAlign: validateTextAlign(properties.textAlign),
    lineHeight: properties.lineHeight,
    charSpacing: properties.charSpacing,
  };
}

/**
 * Validate font size within allowed range
 */
export function validateFontSize(size?: number): number {
  if (!size || !Number.isFinite(size)) {
    return EDITOR_CONSTANTS.TEXT.DEFAULT_FONT_SIZE;
  }
  
  return Math.max(
    EDITOR_CONSTANTS.TEXT.MIN_FONT_SIZE,
    Math.min(EDITOR_CONSTANTS.TEXT.MAX_FONT_SIZE, size)
  );
}

/**
 * Validate font weight
 */
export function validateFontWeight(weight?: number | string): number | string {
  if (!weight) return EDITOR_CONSTANTS.TEXT.DEFAULT_FONT_WEIGHT;
  
  if (typeof weight === 'number') {
    const validWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900];
    return validWeights.includes(weight) ? weight : EDITOR_CONSTANTS.TEXT.DEFAULT_FONT_WEIGHT;
  }
  
  return weight === 'normal' || weight === 'bold' ? weight : EDITOR_CONSTANTS.TEXT.DEFAULT_FONT_WEIGHT;
}

/**
 * Validate color format
 */
export function validateColor(color?: string): string {
  if (!color) return EDITOR_CONSTANTS.TEXT.DEFAULT_COLOR;
  
  // Basic hex color validation
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (hexRegex.test(color)) return color;
  
  // Basic rgb/rgba validation
  const rgbRegex = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/;
  if (rgbRegex.test(color)) return color;
  
  return EDITOR_CONSTANTS.TEXT.DEFAULT_COLOR;
}

/**
 * Validate opacity value
 */
export function validateOpacity(opacity?: number): number {
  if (!opacity || !Number.isFinite(opacity)) {
    return EDITOR_CONSTANTS.TEXT.DEFAULT_OPACITY;
  }
  
  return Math.max(0, Math.min(1, opacity));
}

/**
 * Validate text alignment
 */
export function validateTextAlign(align?: string): 'left' | 'center' | 'right' {
  const validAlignments: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right'];
  return validAlignments.includes(align as 'left' | 'center' | 'right') ? align as 'left' | 'center' | 'right' : 'left';
}

/**
 * Validate file type for upload
 */
export function isValidImageFile(file: File): boolean {
  return file.type === 'image/png';
}

/**
 * Validate canvas dimensions
 */
export function validateCanvasDimensions(width: number, height: number): { width: number; height: number } {
  return {
    width: Math.max(EDITOR_CONSTANTS.CANVAS.MIN_WIDTH, Math.min(EDITOR_CONSTANTS.CANVAS.MAX_WIDTH, width)),
    height: Math.max(EDITOR_CONSTANTS.CANVAS.MIN_HEIGHT, Math.min(EDITOR_CONSTANTS.CANVAS.MAX_HEIGHT, height)),
  };
}