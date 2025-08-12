import { BaseCommand } from './base/Command';
import { IServiceProvider } from '@/types/services';

interface Transform {
  left?: number;
  top?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
}

export class TransformLayerCommand extends BaseCommand {
  private previousTransform: Transform = {};

  constructor(
    services: IServiceProvider,
    private layerId: string,
    private newTransform: Transform
  ) {
    super(services);
  }

  execute(): void {
    const layer = this.services.layers.getLayer(this.layerId);
    if (!layer) return;

    // Store previous transform for undo
    this.previousTransform = {
      left: layer.object.left,
      top: layer.object.top,
      scaleX: layer.object.scaleX,
      scaleY: layer.object.scaleY,
      angle: layer.object.angle,
    };

    // Apply new transform
    layer.object.set(this.newTransform);
    this.services.canvas.render();
  }

  undo(): void {
    const layer = this.services.layers.getLayer(this.layerId);
    if (!layer) return;

    layer.object.set(this.previousTransform);
    this.services.canvas.render();
  }

  get description(): string {
    return 'Transform layer';
  }
}