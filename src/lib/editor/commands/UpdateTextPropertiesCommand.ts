import { BaseCommand } from './base/Command';
import { TextProperties } from '@/types/editor';
import { IServiceProvider } from '@/types/services';

export class UpdateTextPropertiesCommand extends BaseCommand {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private previousProperties: Record<string, any> = {};

  constructor(
    services: IServiceProvider,
    private layerId: string,
    private newProperties: Partial<TextProperties>
  ) {
    super(services);
  }

  execute(): void {
    const layer = this.services.layers.getLayer(this.layerId);
    if (!layer) return;

    // Store previous properties for undo
    this.previousProperties = {};
    const currentProps = this.services.text.getTextProperties(layer.object);
    Object.keys(this.newProperties).forEach(key => {
      const prop = key as keyof TextProperties;
      if (prop in currentProps) {
        this.previousProperties[prop] = currentProps[prop];
      }
    });

    // Apply new properties
    this.services.text.updateTextProperties(layer.object, this.newProperties);
    this.services.canvas.render();
  }

  undo(): void {
    const layer = this.services.layers.getLayer(this.layerId);
    if (!layer) return;

    this.services.text.updateTextProperties(layer.object, this.previousProperties as Partial<TextProperties>);
    this.services.canvas.render();
  }

  get description(): string {
    return 'Update text properties';
  }
}