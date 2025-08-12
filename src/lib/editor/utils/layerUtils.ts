import { TextLayer } from '@/types/editor';
import * as fabric from 'fabric';

/**
 * Find a layer by its ID
 * DRY: Extracted repeated layer finding logic
 */
export function findLayerById(layers: TextLayer[], layerId: string): TextLayer | undefined {
  return layers.find(layer => layer.id === layerId);
}

/**
 * Find a layer by its fabric object
 * DRY: Extracted repeated object-to-layer mapping
 */
export function findLayerByObject(layers: TextLayer[], object: fabric.Object): TextLayer | undefined {
  return layers.find(layer => layer.object === object);
}

/**
 * Sort layers by their order property
 */
export function sortLayersByOrder(layers: TextLayer[]): TextLayer[] {
  return [...layers].sort((a, b) => a.order - b.order);
}

/**
 * Update layer order after reordering
 * DRY: Extracted repeated order update logic
 */
export function updateLayerOrder(layers: TextLayer[]): void {
  layers.forEach((layer, index) => {
    layer.order = index;
  });
}

/**
 * Check if a layer is editable (visible and not locked)
 */
export function isLayerEditable(layer: TextLayer): boolean {
  return layer.visible && !layer.locked;
}

/**
 * Generate a unique layer name
 */
export function generateLayerName(layers: TextLayer[], prefix: string = 'Text'): string {
  const existingNumbers = layers
    .map(layer => {
      const match = layer.name.match(new RegExp(`^${prefix} (\\d+)$`));
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(num => !isNaN(num));

  const nextNumber = existingNumbers.length > 0 
    ? Math.max(...existingNumbers) + 1 
    : 1;

  return `${prefix} ${nextNumber}`;
}