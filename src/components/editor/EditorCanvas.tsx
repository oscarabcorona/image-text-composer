'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas, Line } from 'fabric';
import * as fabric from 'fabric';
import { useEditorStore } from '@/lib/editor/store';
import { EDITOR_CONSTANTS } from '@/lib/editor/constants';

export function EditorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const {
    setCanvas,
    selectLayer,
    layers,
    saveState,
    isAutoSaveEnabled,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToWindow,
    setZoomLevel,
    isPanning,
    setPanning,
    setViewportTransform,
    setBackgroundImage,
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
    
    // Expose canvas and store for testing
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).canvas = fabricCanvas;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).useEditorStore = useEditorStore;
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
      // Handle zoom shortcuts first (they work regardless of selection)
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '+':
          case '=':
            e.preventDefault();
            zoomIn();
            return;
          case '-':
            e.preventDefault();
            zoomOut();
            return;
          case '0':
            e.preventDefault();
            resetZoom();
            return;
          case '9':
            e.preventDefault();
            fitToWindow();
            return;
        }
      }

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
  }, [zoomIn, zoomOut, resetZoom, fitToWindow]); // Add zoom function dependencies

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

  // Mouse wheel zoom
  useEffect(() => {
    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas) return;

    const handleWheel = (opt: fabric.TPointerEventInfo<WheelEvent>) => {
      const e = opt.e;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        // Normalize delta across browsers and platforms
        let delta = e.deltaY;
        if (e.deltaMode === 1) {
          // Firefox uses lines mode
          delta *= 40;
        }
        
        // Calculate zoom change with smooth sensitivity
        const zoomSpeed = 0.003; // Balanced for smooth control
        let zoom = fabricCanvas.getZoom();
        zoom = zoom * (1 - delta * zoomSpeed);

        // Clamp zoom between min and max
        zoom = Math.max(EDITOR_CONSTANTS.ZOOM.MIN, zoom);
        zoom = Math.min(EDITOR_CONSTANTS.ZOOM.MAX, zoom);

        // Get mouse position relative to canvas
        const point = fabricCanvas.getPointer(e);
        
        // Zoom to point
        fabricCanvas.zoomToPoint(new fabric.Point(point.x, point.y), zoom);
        
        // Update store
        setZoomLevel(zoom);
        
        // Also update viewport transform in store
        const vpt = fabricCanvas.viewportTransform;
        if (vpt) {
          setViewportTransform([...vpt]);
        }
      }
    };

    fabricCanvas.on('mouse:wheel', handleWheel);

    return () => {
      fabricCanvas.off('mouse:wheel', handleWheel);
    };
  }, [setZoomLevel, setViewportTransform]);

  // Pan functionality
  useEffect(() => {
    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas) return;

    let isDragging = false;
    let lastPosX = 0;
    let lastPosY = 0;

    // Handle Alt key for pan mode
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !isPanning) {
        e.preventDefault();
        setPanning(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey && isPanning) {
        e.preventDefault();
        setPanning(false);
        isDragging = false;
      }
    };

    // Mouse events for panning
    const handleMouseDown = (opt: fabric.TPointerEventInfo) => {
      if (isPanning) {
        const evt = opt.e as MouseEvent;
        isDragging = true;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
        fabricCanvas.defaultCursor = 'grabbing';
      }
    };

    const handleMouseMove = (opt: fabric.TPointerEventInfo) => {
      if (isDragging && isPanning) {
        const evt = opt.e as MouseEvent;
        const vpt = fabricCanvas.viewportTransform;
        if (vpt) {
          vpt[4] += evt.clientX - lastPosX;
          vpt[5] += evt.clientY - lastPosY;
          fabricCanvas.requestRenderAll();
          setViewportTransform([...vpt]);
        }
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
      }
    };

    const handleMouseUp = () => {
      if (isPanning) {
        isDragging = false;
        fabricCanvas.defaultCursor = 'grab';
      }
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:move', handleMouseMove);
    fabricCanvas.on('mouse:up', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      
      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('mouse:move', handleMouseMove);
      fabricCanvas.off('mouse:up', handleMouseUp);
    };
  }, [isPanning, setPanning, setViewportTransform]);

  // Drag and drop functionality
  useEffect(() => {
    const handleFile = (file: File) => {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert('Please upload a valid image file (PNG, JPEG, GIF, or WebP)');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const imgUrl = event.target?.result as string;
        setBackgroundImage(imgUrl);
      };
      reader.readAsDataURL(file);
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFile(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Check if we're leaving the canvas container entirely
      if (e.currentTarget instanceof HTMLElement) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        
        if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
          setIsDraggingFile(false);
        }
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFile(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    };

    const canvasContainer = canvasRef.current?.parentElement?.parentElement;
    if (canvasContainer) {
      canvasContainer.addEventListener('dragover', handleDragOver);
      canvasContainer.addEventListener('dragleave', handleDragLeave);
      canvasContainer.addEventListener('drop', handleDrop);

      return () => {
        canvasContainer.removeEventListener('dragover', handleDragOver);
        canvasContainer.removeEventListener('dragleave', handleDragLeave);
        canvasContainer.removeEventListener('drop', handleDrop);
      };
    }
  }, [setBackgroundImage]);

  return (
    <div className="flex-1 bg-gray-100 p-8 overflow-auto">
      <div className="flex items-center justify-center min-h-[600px]">
        <div className={`shadow-2xl relative ${isDraggingFile ? 'ring-4 ring-blue-500 ring-opacity-50' : ''}`}>
          <canvas ref={canvasRef} className="border border-gray-300" />
          {isDraggingFile && (
            <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center pointer-events-none">
              <div className="bg-white px-6 py-3 rounded-lg shadow-lg">
                <p className="text-gray-800 font-medium">Drop image here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}