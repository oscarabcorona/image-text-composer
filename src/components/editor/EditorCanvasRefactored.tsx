'use client';

import { useEffect, useRef } from 'react';
import { useEditorStoreRefactored } from '@/lib/editor/store-refactored';
import { useCanvasEvents } from '@/hooks/editor/useCanvasEvents';
import { useKeyboardShortcuts } from '@/hooks/editor/useKeyboardShortcuts';

/**
 * Refactored Canvas component following Single Responsibility Principle
 * Only responsible for canvas initialization and rendering
 */
export function EditorCanvasRefactored() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { 
    services, 
    initializeServices, 
    setSelectedLayerId,
    setLayers 
  } = useEditorStoreRefactored();

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || services) return;
    initializeServices(canvasRef.current);
  }, [services, initializeServices]);

  // Setup event handlers
  useCanvasEvents({
    services: services!,
    onSelectionChange: setSelectedLayerId,
    onObjectModified: () => {
      if (services) {
        setLayers(services.layers.getAllLayers());
      }
    },
    onTextChanged: () => {
      if (services) {
        setLayers(services.layers.getAllLayers());
      }
    },
  });

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    services: services!,
    enabled: !!services,
  });

  if (!services) {
    return (
      <div className="flex items-center justify-center bg-gray-100 p-8 min-h-[600px]">
        <div className="text-gray-500">Initializing canvas...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center bg-gray-100 p-8 min-h-[600px]">
      <div className="shadow-2xl">
        <canvas ref={canvasRef} className="border border-gray-300" />
      </div>
    </div>
  );
}