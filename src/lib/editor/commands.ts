import * as fabric from 'fabric';
import { EditorCommand, TextLayer, TextProperties } from '@/types/editor';
import { useEditorStore } from './store';

export class AddTextLayerCommand implements EditorCommand {
  private layer: TextLayer | null = null;
  private canvas: fabric.Canvas;
  
  constructor(private text: string = 'New Text') {
    const state = useEditorStore.getState();
    if (!state.canvas) throw new Error('Canvas not initialized');
    this.canvas = state.canvas;
  }

  execute(): void {
    const state = useEditorStore.getState();
    this.layer = state.addTextLayer(this.text);
  }

  undo(): void {
    if (!this.layer) return;
    const state = useEditorStore.getState();
    state.deleteLayer(this.layer.id);
  }

  get description(): string {
    return 'Add text layer';
  }
}

export class DeleteLayerCommand implements EditorCommand {
  private layer: TextLayer | null = null;
  private layerIndex: number = -1;
  
  constructor(private layerId: string) {}

  execute(): void {
    const state = useEditorStore.getState();
    const layer = state.layers.find(l => l.id === this.layerId);
    if (!layer) return;
    
    this.layer = { ...layer };
    this.layerIndex = state.layers.indexOf(layer);
    state.deleteLayer(this.layerId);
  }

  undo(): void {
    if (!this.layer || !this.layer.object) return;
    const state = useEditorStore.getState();
    const { canvas, layers } = state;
    if (!canvas) return;

    // Re-add the object to canvas
    canvas.add(this.layer.object);
    
    // Re-add the layer to the store
    const newLayers = [...layers];
    newLayers.splice(this.layerIndex, 0, this.layer);
    
    // Update store
    useEditorStore.setState({ layers: newLayers });
  }

  get description(): string {
    return 'Delete layer';
  }
}

export class UpdateTextPropertiesCommand implements EditorCommand {
  private previousProperties: Partial<TextProperties> = {};
  
  constructor(
    private layerId: string,
    private newProperties: Partial<TextProperties>
  ) {}

  execute(): void {
    const state = useEditorStore.getState();
    const layer = state.layers.find(l => l.id === this.layerId);
    if (!layer) return;

    // Store previous properties
    Object.keys(this.newProperties).forEach(key => {
      const prop = key as keyof TextProperties;
      const currentValue = layer.object.get(prop as keyof fabric.IText);
      this.previousProperties[prop] = currentValue;
    });

    // Apply new properties
    state.updateTextProperties(this.layerId, this.newProperties);
  }

  undo(): void {
    const state = useEditorStore.getState();
    state.updateTextProperties(this.layerId, this.previousProperties);
  }

  get description(): string {
    return 'Update text properties';
  }
}

export class MoveLayerCommand implements EditorCommand {
  private previousPosition: { left: number; top: number } | null = null;
  
  constructor(
    private layerId: string,
    private newPosition: { left: number; top: number }
  ) {}

  execute(): void {
    const state = useEditorStore.getState();
    const layer = state.layers.find(l => l.id === this.layerId);
    if (!layer || !state.canvas) return;

    this.previousPosition = {
      left: layer.object.left || 0,
      top: layer.object.top || 0,
    };

    layer.object.set({
      left: this.newPosition.left,
      top: this.newPosition.top,
    });
    
    state.canvas.renderAll();
  }

  undo(): void {
    if (!this.previousPosition) return;
    
    const state = useEditorStore.getState();
    const layer = state.layers.find(l => l.id === this.layerId);
    if (!layer || !state.canvas) return;

    layer.object.set({
      left: this.previousPosition.left,
      top: this.previousPosition.top,
    });
    
    state.canvas.renderAll();
  }

  get description(): string {
    return 'Move layer';
  }
}

export class TransformLayerCommand implements EditorCommand {
  private previousTransform: {
    left?: number;
    top?: number;
    scaleX?: number;
    scaleY?: number;
    angle?: number;
  } | null = null;
  
  constructor(
    private layerId: string,
    private newTransform: {
      left?: number;
      top?: number;
      scaleX?: number;
      scaleY?: number;
      angle?: number;
    }
  ) {}

  execute(): void {
    const state = useEditorStore.getState();
    const layer = state.layers.find(l => l.id === this.layerId);
    if (!layer || !state.canvas) return;

    this.previousTransform = {
      left: layer.object.left,
      top: layer.object.top,
      scaleX: layer.object.scaleX,
      scaleY: layer.object.scaleY,
      angle: layer.object.angle,
    };

    layer.object.set(this.newTransform);
    state.canvas.renderAll();
  }

  undo(): void {
    if (!this.previousTransform) return;
    
    const state = useEditorStore.getState();
    const layer = state.layers.find(l => l.id === this.layerId);
    if (!layer || !state.canvas) return;

    layer.object.set(this.previousTransform);
    state.canvas.renderAll();
  }

  get description(): string {
    return 'Transform layer';
  }
}