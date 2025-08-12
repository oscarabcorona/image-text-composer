import { IServiceProvider } from '@/types/services';
import { EditorCommand, TextProperties } from '@/types/editor';
import { AddTextLayerCommand } from './AddTextLayerCommand';
import { DeleteLayerCommand } from './DeleteLayerCommand';
import { UpdateTextPropertiesCommand } from './UpdateTextPropertiesCommand';
import { TransformLayerCommand } from './TransformLayerCommand';

/**
 * Factory for creating commands with dependency injection
 * Following Factory Pattern and Dependency Injection
 */
export class CommandFactory {
  constructor(private services: IServiceProvider) {}

  createAddTextLayerCommand(
    text: string = 'New Text',
    position?: { x: number; y: number }
  ): EditorCommand {
    return new AddTextLayerCommand(this.services, text, position);
  }

  createDeleteLayerCommand(layerId: string): EditorCommand {
    return new DeleteLayerCommand(this.services, layerId);
  }

  createUpdateTextPropertiesCommand(
    layerId: string,
    properties: Partial<TextProperties>
  ): EditorCommand {
    return new UpdateTextPropertiesCommand(this.services, layerId, properties);
  }

  createTransformLayerCommand(
    layerId: string,
    transform: {
      left?: number;
      top?: number;
      scaleX?: number;
      scaleY?: number;
      angle?: number;
    }
  ): EditorCommand {
    return new TransformLayerCommand(this.services, layerId, transform);
  }
}