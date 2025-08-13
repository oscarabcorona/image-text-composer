import { useEffect } from 'react';
import * as fabric from 'fabric';
import { IServiceProvider } from '@/types/services';
import { findLayerByObject } from '@/lib/editor/utils/layerUtils';

interface UseCanvasEventsProps {
  services: IServiceProvider;
  onSelectionChange?: (layerId: string | null) => void;
  onObjectModified?: (layerId: string) => void;
  onTextChanged?: (layerId: string, text: string) => void;
}

/**
 * Hook to handle canvas events
 * DRY: Centralizes canvas event handling logic
 */
export function useCanvasEvents({
  services,
  onSelectionChange,
  onObjectModified,
  onTextChanged,
}: UseCanvasEventsProps) {
  useEffect(() => {
    const canvas = services.canvas.getCanvas();
    if (!canvas) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSelectionCreated = (e: any) => {
      if (e.selected && e.selected[0]) {
        const selectedObject = e.selected[0];
        const layer = findLayerByObject(services.layers.getAllLayers(), selectedObject as fabric.FabricObject);
        if (layer) {
          services.selection.selectLayer(layer.id);
          onSelectionChange?.(layer.id);
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSelectionUpdated = (e: any) => {
      if (e.selected && e.selected[0]) {
        const selectedObject = e.selected[0];
        const layer = findLayerByObject(services.layers.getAllLayers(), selectedObject as fabric.FabricObject);
        if (layer) {
          services.selection.selectLayer(layer.id);
          onSelectionChange?.(layer.id);
        }
      }
    };

    const handleSelectionCleared = () => {
      services.selection.selectLayer(null);
      onSelectionChange?.(null);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleTextChanged = (e: any) => {
      if (e.target && e.target.type === 'i-text') {
        const layer = findLayerByObject(services.layers.getAllLayers(), e.target as fabric.FabricObject);
        if (layer) {
          onTextChanged?.(layer.id, e.target.text || '');
          services.autoSave.save(services.layers.getAllLayers());
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleObjectModified = (e: any) => {
      if (e.target) {
        const layer = findLayerByObject(services.layers.getAllLayers(), e.target as fabric.FabricObject);
        if (layer) {
          onObjectModified?.(layer.id);
          services.autoSave.save(services.layers.getAllLayers());
        }
      }
    };

    // Add event listeners
    canvas.on('selection:created', handleSelectionCreated);
    canvas.on('selection:updated', handleSelectionUpdated);
    canvas.on('selection:cleared', handleSelectionCleared);
    canvas.on('text:changed', handleTextChanged);
    canvas.on('object:modified', handleObjectModified);

    // Cleanup
    return () => {
      canvas.off('selection:created', handleSelectionCreated);
      canvas.off('selection:updated', handleSelectionUpdated);
      canvas.off('selection:cleared', handleSelectionCleared);
      canvas.off('text:changed', handleTextChanged);
      canvas.off('object:modified', handleObjectModified);
    };
  }, [services, onSelectionChange, onObjectModified, onTextChanged]);
}