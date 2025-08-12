import { Object as FabricObject } from 'fabric';
import { ISelectionService, ICanvasService, ILayerService } from '@/types/services';

export class SelectionService implements ISelectionService {
  private selectedLayerId: string | null = null;

  constructor(
    private canvasService: ICanvasService,
    private layerService: ILayerService
  ) {}

  selectLayer(layerId: string | null): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    if (layerId) {
      const layer = this.layerService.getLayer(layerId);
      if (layer && !layer.locked) {
        canvas.setActiveObject(layer.object);
        this.selectedLayerId = layerId;
      }
    } else {
      canvas.discardActiveObject();
      this.selectedLayerId = null;
    }

    this.canvasService.render();
  }

  getSelectedLayerId(): string | null {
    return this.selectedLayerId;
  }

  getSelectedObject(): FabricObject | null {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return null;

    return canvas.getActiveObject() || null;
  }

  clearSelection(): void {
    this.selectLayer(null);
  }
}