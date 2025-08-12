import { IText } from 'fabric';
import { v4 as uuidv4 } from 'uuid';
import { ILayerService, ICanvasService } from '@/types/services';
import { TextLayer } from '@/types/editor';

export class LayerService implements ILayerService {
  private layers: TextLayer[] = [];

  constructor(private canvasService: ICanvasService) {}

  addLayer(object: IText): TextLayer {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) throw new Error('Canvas not initialized');

    const id = uuidv4();
    const newLayer: TextLayer = {
      id,
      object,
      name: `Text ${this.layers.length + 1}`,
      visible: true,
      locked: false,
      order: this.layers.length,
    };

    canvas.add(object);
    this.layers.push(newLayer);
    this.canvasService.render();

    return newLayer;
  }

  removeLayer(layerId: string): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    const layerIndex = this.layers.findIndex(l => l.id === layerId);
    if (layerIndex === -1) return;

    const layer = this.layers[layerIndex];
    canvas.remove(layer.object);
    this.layers.splice(layerIndex, 1);
    
    // Update order for remaining layers
    this.layers.forEach((layer, index) => {
      layer.order = index;
    });

    this.canvasService.render();
  }

  updateLayer(layerId: string, updates: Partial<TextLayer>): void {
    const layer = this.getLayer(layerId);
    if (!layer) return;

    Object.assign(layer, updates);
  }

  getLayer(layerId: string): TextLayer | undefined {
    return this.layers.find(l => l.id === layerId);
  }

  getAllLayers(): TextLayer[] {
    return [...this.layers];
  }

  reorderLayers(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= this.layers.length) return;
    if (toIndex < 0 || toIndex >= this.layers.length) return;

    const [movedLayer] = this.layers.splice(fromIndex, 1);
    this.layers.splice(toIndex, 0, movedLayer);

    // Update order property
    this.layers.forEach((layer, index) => {
      layer.order = index;
    });

    this.canvasService.render();
  }

  toggleVisibility(layerId: string): void {
    const layer = this.getLayer(layerId);
    if (!layer) return;

    layer.visible = !layer.visible;
    layer.object.visible = layer.visible;
    this.canvasService.render();
  }

  toggleLock(layerId: string): void {
    const layer = this.getLayer(layerId);
    if (!layer) return;

    layer.locked = !layer.locked;
    layer.object.selectable = !layer.locked;
    layer.object.evented = !layer.locked;
    this.canvasService.render();
  }

  clear(): void {
    this.layers = [];
  }
}