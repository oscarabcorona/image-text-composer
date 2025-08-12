import { BaseCommand } from './base/Command';
import { TextLayer } from '@/types/editor';
import { IServiceProvider } from '@/types/services';

export class DeleteLayerCommand extends BaseCommand {
  private deletedLayer: TextLayer | null = null;
  private layerIndex: number = -1;

  constructor(
    services: IServiceProvider,
    private layerId: string
  ) {
    super(services);
  }

  execute(): void {
    const layer = this.services.layers.getLayer(this.layerId);
    if (!layer) return;

    // Store layer data for undo
    this.deletedLayer = { ...layer };
    const allLayers = this.services.layers.getAllLayers();
    this.layerIndex = allLayers.findIndex(l => l.id === this.layerId);

    // Remove the layer
    this.services.layers.removeLayer(this.layerId);

    // Clear selection if this layer was selected
    if (this.services.selection.getSelectedLayerId() === this.layerId) {
      this.services.selection.selectLayer(null);
    }
  }

  undo(): void {
    if (!this.deletedLayer) return;

    const canvas = this.services.canvas.getCanvas();
    if (!canvas) return;

    // Recreate the text object
    const textObject = this.services.text.createText(
      this.deletedLayer.object.text || '',
      this.services.text.getTextProperties(this.deletedLayer.object)
    );

    // Restore position and transformation
    textObject.set({
      left: this.deletedLayer.object.left,
      top: this.deletedLayer.object.top,
      angle: this.deletedLayer.object.angle,
      scaleX: this.deletedLayer.object.scaleX,
      scaleY: this.deletedLayer.object.scaleY,
    });

    // Add the layer back
    const newLayer = this.services.layers.addLayer(textObject);
    
    // Restore layer properties
    this.services.layers.updateLayer(newLayer.id, {
      name: this.deletedLayer.name,
      visible: this.deletedLayer.visible,
      locked: this.deletedLayer.locked,
    });

    // Restore layer order
    const allLayers = this.services.layers.getAllLayers();
    if (this.layerIndex >= 0 && this.layerIndex < allLayers.length - 1) {
      const currentIndex = allLayers.findIndex(l => l.id === newLayer.id);
      this.services.layers.reorderLayers(currentIndex, this.layerIndex);
    }
  }

  get description(): string {
    return 'Delete layer';
  }
}