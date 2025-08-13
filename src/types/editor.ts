import { IText, FabricImage } from 'fabric';

export interface TextLayer {
  id: string;
  object: IText;
  name: string;
  visible: boolean;
  locked: boolean;
  order: number;
}

export interface TextProperties {
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  fill: string;
  opacity: number;
  textAlign: 'left' | 'center' | 'right';
  lineHeight?: number;
  charSpacing?: number;
  // Text shadow properties
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

export interface CanvasState {
  backgroundImage: FabricImage | null;
  layers: TextLayer[];
  selectedLayerId: string | null;
  canvasWidth: number;
  canvasHeight: number;
  originalImageWidth: number;
  originalImageHeight: number;
}

export interface EditorCommand {
  execute: () => void;
  undo: () => void;
  description: string;
}

export interface EditorHistory {
  commands: EditorCommand[];
  currentIndex: number;
}

export interface GoogleFont {
  family: string;
  variants: string[];
  subsets: string[];
  category: string;
}

export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 'normal' | 'bold';

export interface Point {
  x: number;
  y: number;
}

export interface ExportOptions {
  format: 'png';
  quality?: number;
  multiplier?: number;
}