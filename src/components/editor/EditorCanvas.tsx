'use client';

import { useEffect, useRef } from 'react';
import { Canvas, Line } from 'fabric';
import { useEditorStore } from '@/lib/editor/store';
import { EDITOR_CONSTANTS } from '@/lib/editor/constants';

export function EditorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const {
    setCanvas,
    selectLayer,
    layers,
    saveState,
    isAutoSaveEnabled,
  } = useEditorStore();

  // Initialize canvas only once
  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    const fabricCanvas = new Canvas(canvasRef.current, {
      width: EDITOR_CONSTANTS.CANVAS.DEFAULT_WIDTH,
      height: EDITOR_CONSTANTS.CANVAS.DEFAULT_HEIGHT,
      backgroundColor: EDITOR_CONSTANTS.CANVAS.BACKGROUND_COLOR,
      preserveObjectStacking: true,
      selection: true,
      renderOnAddRemove: true,
    });

    // Store the canvas reference
    fabricCanvasRef.current = fabricCanvas;

    // Set canvas in store
    setCanvas(fabricCanvas);
    
    // Expose canvas for testing
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).canvas = fabricCanvas;
    }
    
    // Initial render
    fabricCanvas.requestRenderAll();

    return () => {
      // Mark canvas as disposed in store before disposal
      useEditorStore.setState({ isCanvasDisposed: true, canvas: null, isCanvasReady: false });
      fabricCanvasRef.current = null;
      
      // Dispose is async in v6, but we don't need to await in cleanup
      fabricCanvas.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once

  // Set up event listeners in a separate effect
  useEffect(() => {
    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas) return;

    // Selection event handlers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSelectionCreated = (e: any) => {
      if (e.selected && e.selected[0]) {
        const selectedObject = e.selected[0];
        const layer = layers.find((l) => l.object === selectedObject);
        if (layer) {
          selectLayer(layer.id);
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSelectionUpdated = (e: any) => {
      if (e.selected && e.selected[0]) {
        const selectedObject = e.selected[0];
        const layer = layers.find((l) => l.object === selectedObject);
        if (layer) {
          selectLayer(layer.id);
        }
      }
    };

    const handleSelectionCleared = () => {
      selectLayer(null);
    };

    // Text and modification handlers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleTextChanged = (e: any) => {
      if (e.target && e.target.type === 'i-text') {
        const layer = layers.find((l) => l.object === e.target);
        if (layer && isAutoSaveEnabled) {
          saveState();
        }
      }
    };

    const handleObjectModified = () => {
      if (isAutoSaveEnabled) {
        saveState();
      }
    };

    // Add event listeners
    fabricCanvas.on('selection:created', handleSelectionCreated);
    fabricCanvas.on('selection:updated', handleSelectionUpdated);
    fabricCanvas.on('selection:cleared', handleSelectionCleared);
    fabricCanvas.on('text:changed', handleTextChanged);
    fabricCanvas.on('object:modified', handleObjectModified);

    // Cleanup
    return () => {
      fabricCanvas.off('selection:created', handleSelectionCreated);
      fabricCanvas.off('selection:updated', handleSelectionUpdated);
      fabricCanvas.off('selection:cleared', handleSelectionCleared);
      fabricCanvas.off('text:changed', handleTextChanged);
      fabricCanvas.off('object:modified', handleObjectModified);
    };

  }, [layers, selectLayer, saveState, isAutoSaveEnabled]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeObject = fabricCanvas.getActiveObject();
      if (!activeObject || activeObject.type !== 'i-text') return;

      const nudgeDistance = e.shiftKey
        ? EDITOR_CONSTANTS.KEYBOARD.NUDGE_DISTANCE_SHIFT
        : EDITOR_CONSTANTS.KEYBOARD.NUDGE_DISTANCE;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          activeObject.set('top', (activeObject.top || 0) - nudgeDistance);
          fabricCanvas.renderAll();
          break;
        case 'ArrowDown':
          e.preventDefault();
          activeObject.set('top', (activeObject.top || 0) + nudgeDistance);
          fabricCanvas.renderAll();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          activeObject.set('left', (activeObject.left || 0) - nudgeDistance);
          fabricCanvas.renderAll();
          break;
        case 'ArrowRight':
          e.preventDefault();
          activeObject.set('left', (activeObject.left || 0) + nudgeDistance);
          fabricCanvas.renderAll();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // No dependencies - canvas ref is stable

  // Snap to center functionality
  useEffect(() => {
    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas) return;

    let centerLineX: Line | null = null;
    let centerLineY: Line | null = null;

    fabricCanvas.on('object:moving', (e) => {
      if (!e.target) return;

      const obj = e.target;
      const canvasWidth = fabricCanvas.width || 0;
      const canvasHeight = fabricCanvas.height || 0;
      const objWidth = obj.width! * obj.scaleX!;
      const objHeight = obj.height! * obj.scaleY!;

      // Calculate object center
      const objCenterX = obj.left! + objWidth / 2;
      const objCenterY = obj.top! + objHeight / 2;

      // Check for center snap
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;

      let snappedX = false;
      let snappedY = false;

      // Snap to horizontal center
      if (Math.abs(objCenterX - centerX) < EDITOR_CONSTANTS.SNAP.THRESHOLD) {
        obj.set('left', centerX - objWidth / 2);
        snappedX = true;

        if (!centerLineX) {
          centerLineX = new Line([centerX, 0, centerX, canvasHeight], {
            stroke: EDITOR_CONSTANTS.SNAP.CENTER_LINE_COLOR,
            strokeWidth: EDITOR_CONSTANTS.SNAP.CENTER_LINE_WIDTH,
            selectable: false,
            evented: false,
          });
          fabricCanvas.add(centerLineX);
        }
      }

      // Snap to vertical center
      if (Math.abs(objCenterY - centerY) < EDITOR_CONSTANTS.SNAP.THRESHOLD) {
        obj.set('top', centerY - objHeight / 2);
        snappedY = true;

        if (!centerLineY) {
          centerLineY = new Line([0, centerY, canvasWidth, centerY], {
            stroke: EDITOR_CONSTANTS.SNAP.CENTER_LINE_COLOR,
            strokeWidth: EDITOR_CONSTANTS.SNAP.CENTER_LINE_WIDTH,
            selectable: false,
            evented: false,
          });
          fabricCanvas.add(centerLineY);
        }
      }

      // Remove center lines if not snapping
      if (!snappedX && centerLineX) {
        fabricCanvas.remove(centerLineX);
        centerLineX = null;
      }
      if (!snappedY && centerLineY) {
        fabricCanvas.remove(centerLineY);
        centerLineY = null;
      }
    });

    fabricCanvas.on('object:modified', () => {
      // Clean up center lines after moving
      if (centerLineX) {
        fabricCanvas.remove(centerLineX);
        centerLineX = null;
      }
      if (centerLineY) {
        fabricCanvas.remove(centerLineY);
        centerLineY = null;
      }
    });
  }, []); // No dependencies - canvas ref is stable

  return (
    <div className="flex items-center justify-center bg-gray-100 p-8 min-h-[600px]">
      <div className="shadow-2xl">
        <canvas ref={canvasRef} className="border border-gray-300" />
      </div>
    </div>
  );
}