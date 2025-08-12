import { Canvas, IText, Object as FabricObject, TDataUrlOptions } from 'fabric';
import { TextLayer, TextProperties, EditorCommand } from './editor';

// Interface Segregation Principle: Split large interfaces into focused ones

export interface ICanvasService {
  initialize(canvas: HTMLCanvasElement): Canvas;
  setDimensions(width: number, height: number): void;
  setBackgroundImage(dataUrl: string): Promise<void>;
  clear(): void;
  render(): void;
  toDataURL(options?: TDataUrlOptions): string;
  getCanvas(): Canvas | null;
}

export interface ILayerService {
  addLayer(object: IText): TextLayer;
  removeLayer(layerId: string): void;
  updateLayer(layerId: string, updates: Partial<TextLayer>): void;
  getLayer(layerId: string): TextLayer | undefined;
  getAllLayers(): TextLayer[];
  reorderLayers(fromIndex: number, toIndex: number): void;
  toggleVisibility(layerId: string): void;
  toggleLock(layerId: string): void;
}

export interface ITextService {
  createText(text: string, properties?: Partial<TextProperties>): IText;
  updateTextProperties(object: IText, properties: Partial<TextProperties>): void;
  getTextProperties(object: IText): TextProperties;
}

export interface IHistoryService {
  execute(command: EditorCommand): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
  getHistory(): EditorCommand[];
}

export interface IAutoSaveService {
  save(data: unknown): void;
  load<T>(): T | null;
  clear(): void;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
}

export interface ISelectionService {
  selectLayer(layerId: string | null): void;
  getSelectedLayerId(): string | null;
  getSelectedObject(): FabricObject | null;
}

export interface ISnapService {
  enableSnapping(enabled: boolean): void;
  setSnapThreshold(threshold: number): void;
  checkSnap(object: FabricObject): { x: number; y: number } | null;
}

// Service provider interface for dependency injection
export interface IServiceProvider {
  canvas: ICanvasService;
  layers: ILayerService;
  text: ITextService;
  history: IHistoryService;
  autoSave: IAutoSaveService;
  selection: ISelectionService;
  snap: ISnapService;
}