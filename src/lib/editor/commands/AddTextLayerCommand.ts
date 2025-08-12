import { BaseCommand } from './base/Command';
import { TextLayer } from '@/types/editor';
import { IServiceProvider } from '@/types/services';

export class AddTextLayerCommand extends BaseCommand {
  private layer: TextLayer | null = null;

  constructor(
    services: IServiceProvider,
    private text: string = 'New Text',
    private position?: { x: number; y: number }
  ) {
    super(services);
  }

  execute(): void {
    const canvas = this.services.canvas.getCanvas();
    if (!canvas) throw new Error('Canvas not initialized');

    // Create text object
    const textObject = this.services.text.createText(this.text);
    
    // Set position
    if (this.position) {
      textObject.set({
        left: this.position.x,
        top: this.position.y,
      });
    } else {
      // Center on canvas
      textObject.set({
        left: canvas.width! / 2,
        top: canvas.height! / 2,
      });
    }

    // Add layer
    this.layer = this.services.layers.addLayer(textObject);
    
    // Select the new layer
    this.services.selection.selectLayer(this.layer.id);
  }

  undo(): void {
    if (!this.layer) return;
    
    this.services.layers.removeLayer(this.layer.id);
    this.services.selection.selectLayer(null);
  }

  get description(): string {
    return 'Add text layer';
  }
}