'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  GripVertical,
  Layers,
  Copy,
  ChevronRight,
} from 'lucide-react';
import { useEditorStore } from '@/lib/editor/store';
import { cn } from '@/lib/utils';

export function LayerPanel() {
  const {
    layers,
    selectedLayerId,
    selectLayer,
    deleteLayer,
    duplicateLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    reorderLayers,
    layersPanelCollapsed,
    toggleLayersPanel,
  } = useEditorStore();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    reorderLayers(draggedIndex, dropIndex);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className={`bg-white border-l border-gray-200 flex flex-col h-full transition-all duration-300 ${
      layersPanelCollapsed ? 'w-12' : 'w-80'
    }`}>
      <div className={`border-b border-gray-200 ${layersPanelCollapsed ? 'p-2' : 'p-4'}`}>
        {layersPanelCollapsed ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLayersPanel}
            className="w-full p-0 h-8"
            title="Expand layers"
          >
            <Layers className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Layers
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLayersPanel}
              className="h-6 w-6 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {!layersPanelCollapsed && (
        <ScrollArea className="flex-1">
          <div className="p-2">
          {layers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No layers yet. Add text to get started.
            </p>
          ) : (
            <div className="space-y-1">
              {layers.map((layer, index) => (
                <div
                  key={layer.id}
                  data-testid="layer-item"
                  draggable={!layer.locked}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors',
                    selectedLayerId === layer.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent',
                    draggedIndex === index && 'opacity-50'
                  )}
                  onClick={() => selectLayer(layer.id)}
                >
                  {/* Drag Handle */}
                  <GripVertical
                    className={cn(
                      'h-4 w-4 text-gray-400',
                      layer.locked && 'opacity-50 cursor-not-allowed'
                    )}
                  />

                  {/* Layer Name */}
                  <span
                    className={cn(
                      'flex-1 text-sm truncate',
                      !layer.visible && 'opacity-50'
                    )}
                  >
                    {layer.name}
                  </span>

                  {/* Layer Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Visibility Toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLayerVisibility(layer.id);
                      }}
                    >
                      {layer.visible ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                    </Button>

                    {/* Lock Toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      aria-label={layer.locked ? "Unlock layer" : "Lock layer"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLayerLock(layer.id);
                      }}
                    >
                      {layer.locked ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : (
                        <Unlock className="h-3.5 w-3.5" />
                      )}
                    </Button>

                    {/* Duplicate */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      aria-label="Duplicate layer"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateLayer(layer.id);
                      }}
                      title="Duplicate layer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                      aria-label="Delete layer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this layer?')) {
                          deleteLayer(layer.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}