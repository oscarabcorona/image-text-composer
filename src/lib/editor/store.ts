import { create } from 'zustand';
import { Canvas, FabricImage, IText } from 'fabric';
import { v4 as uuidv4 } from 'uuid';
import { CanvasState, TextLayer, TextProperties, EditorCommand } from '@/types/editor';
import { EDITOR_CONSTANTS } from './constants';
import { AutoSaveService } from './services/AutoSaveService';

interface EditorStore extends CanvasState {
  canvas: Canvas | null;
  isCanvasReady: boolean;
  isCanvasDisposed: boolean;
  history: EditorCommand[];
  historyIndex: number;
  isAutoSaveEnabled: boolean;
  zoomLevel: number;
  isPanning: boolean;
  viewportTransform: number[];
  
  // Panel visibility
  leftPanelCollapsed: boolean;
  layersPanelCollapsed: boolean;
  historyPanelCollapsed: boolean;

  // Canvas actions
  setCanvas: (canvas: Canvas) => void;
  setBackgroundImage: (dataUrl: string) => void;
  clearCanvas: () => void;
  
  // Zoom actions
  setZoomLevel: (level: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToWindow: () => void;
  resetZoom: () => void;
  
  // Pan actions
  setPanning: (isPanning: boolean) => void;
  setViewportTransform: (transform: number[]) => void;
  resetViewport: () => void;
  
  // Panel actions
  toggleLeftPanel: () => void;
  toggleLayersPanel: () => void;
  toggleHistoryPanel: () => void;
  toggleAllPanels: () => void;

  // Layer actions
  addTextLayer: (text?: string) => TextLayer;
  updateLayer: (layerId: string, updates: Partial<TextLayer>) => void;
  deleteLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => void;
  selectLayer: (layerId: string | null) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;

  // Text properties actions
  updateTextProperties: (layerId: string, properties: Partial<TextProperties>) => void;

  // History actions
  executeCommand: (command: EditorCommand) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Auto-save actions
  setAutoSave: (enabled: boolean) => void;
  saveState: () => void;
  loadState: () => void;
  resetState: () => void;
}

const initialState: CanvasState = {
  backgroundImage: null,
  layers: [],
  selectedLayerId: null,
  canvasWidth: EDITOR_CONSTANTS.CANVAS.DEFAULT_WIDTH,
  canvasHeight: EDITOR_CONSTANTS.CANVAS.DEFAULT_HEIGHT,
  originalImageWidth: EDITOR_CONSTANTS.CANVAS.DEFAULT_WIDTH,
  originalImageHeight: EDITOR_CONSTANTS.CANVAS.DEFAULT_HEIGHT,
};

// Create auto-save service instance
const autoSaveService = new AutoSaveService();

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...initialState,
  canvas: null,
  isCanvasReady: false,
  isCanvasDisposed: false,
  history: [],
  historyIndex: -1,
  isAutoSaveEnabled: true,
  zoomLevel: EDITOR_CONSTANTS.ZOOM.DEFAULT,
  isPanning: false,
  viewportTransform: [1, 0, 0, 1, 0, 0], // Default identity matrix
  leftPanelCollapsed: false,
  layersPanelCollapsed: false,
  historyPanelCollapsed: false,

  setCanvas: (canvas) => {
    set({ canvas, isCanvasReady: true, isCanvasDisposed: false });
  },

  setBackgroundImage: async (dataUrl) => {
    const state = get();
    const { canvas, isCanvasReady, isCanvasDisposed } = state;
    if (!canvas || !isCanvasReady || isCanvasDisposed) {
      console.warn('Canvas not ready or disposed for background image');
      return;
    }

    try {
      // Use FabricImage.fromURL for v6 compatibility
      const img = await FabricImage.fromURL(dataUrl);
      
      // Check if canvas is still valid after async operation
      const currentState = get();
      if (!currentState.canvas || currentState.isCanvasDisposed) {
        console.warn('Canvas was disposed during image loading');
        return;
      }
      
      const imageWidth = img.width || 800;
      const imageHeight = img.height || 600;

      // Only resize if necessary
      const needsResize = imageWidth > canvas.width || imageHeight > canvas.height;
      
      if (needsResize) {
        const newWidth = Math.min(imageWidth, EDITOR_CONSTANTS.CANVAS.MAX_WIDTH);
        const newHeight = Math.min(imageHeight, EDITOR_CONSTANTS.CANVAS.MAX_HEIGHT);
        
        canvas.setWidth(newWidth);
        canvas.setHeight(newHeight);
        canvas.requestRenderAll();
      }
      
      // Set background image directly (v6 pattern)
      canvas.backgroundImage = img;
      
      // Ensure proper rendering
      canvas.requestRenderAll();
      
      set({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        backgroundImage: img as any,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        originalImageWidth: imageWidth,
        originalImageHeight: imageHeight,
      });

      if (state.isAutoSaveEnabled) {
        state.saveState();
      }
    } catch (error) {
      console.error('Failed to set background image:', error);
    }
  },

  clearCanvas: () => {
    const { canvas, isCanvasReady, isCanvasDisposed } = get();
    if (!canvas || !isCanvasReady || isCanvasDisposed) return;

    try {
      canvas.clear();
      canvas.backgroundColor = EDITOR_CONSTANTS.CANVAS.BACKGROUND_COLOR;
      canvas.renderAll();
      set({ ...initialState, canvas, isCanvasReady: true });
    } catch (error) {
      console.error('Failed to clear canvas:', error);
    }
  },

  addTextLayer: (text = 'New Text') => {
    const state = get();
    const { canvas, layers, isCanvasReady, isCanvasDisposed } = state;
    if (!canvas || !isCanvasReady || isCanvasDisposed) throw new Error('Canvas not initialized or disposed');

    const id = uuidv4();
    const fabricText = new IText(text, {
      left: canvas.width! / 2,
      top: canvas.height! / 2,
      fontFamily: EDITOR_CONSTANTS.TEXT.DEFAULT_FONT_FAMILY,
      fontSize: EDITOR_CONSTANTS.TEXT.DEFAULT_FONT_SIZE,
      fill: EDITOR_CONSTANTS.TEXT.DEFAULT_COLOR,
      originX: 'center',
      originY: 'center',
    });

    canvas.add(fabricText);
    canvas.setActiveObject(fabricText);
    canvas.renderAll();

    const newLayer: TextLayer = {
      id,
      object: fabricText,
      name: `Text ${layers.length + 1}`,
      visible: true,
      locked: false,
      order: layers.length,
    };

    set({
      layers: [...layers, newLayer],
      selectedLayerId: id,
    });

    // Add to history
    const command: EditorCommand = {
      execute: () => {
        // Already executed
      },
      undo: () => {
        get().deleteLayer(id);
      },
      description: `Add text layer "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`,
    };
    get().executeCommand(command);

    if (state.isAutoSaveEnabled) {
      state.saveState();
    }

    return newLayer;
  },

  updateLayer: (layerId, updates) => {
    const state = get();
    set({
      layers: state.layers.map((layer) =>
        layer.id === layerId ? { ...layer, ...updates } : layer
      ),
    });

    if (state.isAutoSaveEnabled) {
      state.saveState();
    }
  },

  deleteLayer: (layerId) => {
    const state = get();
    const { canvas, layers } = state;
    if (!canvas) return;

    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;

    canvas.remove(layer.object);
    canvas.renderAll();

    set({
      layers: layers.filter((l) => l.id !== layerId),
      selectedLayerId: state.selectedLayerId === layerId ? null : state.selectedLayerId,
    });

    if (state.isAutoSaveEnabled) {
      state.saveState();
    }
  },

  duplicateLayer: async (layerId) => {
    const state = get();
    const { canvas, layers, isCanvasReady, isCanvasDisposed } = state;
    if (!canvas || !isCanvasReady || isCanvasDisposed) return;

    const layerToDuplicate = layers.find((l) => l.id === layerId);
    if (!layerToDuplicate) return;

    // Clone the text object (returns Promise in v6)
    const clonedObject = await layerToDuplicate.object.clone() as IText;
    
    // Offset the clone slightly so it's visible
    clonedObject.set({
      left: (clonedObject.left || 0) + 20,
      top: (clonedObject.top || 0) + 20,
    });

    // Add to canvas
    canvas.add(clonedObject);
    canvas.setActiveObject(clonedObject);
    canvas.renderAll();

    // Create new layer
    const id = uuidv4();
    const newLayer: TextLayer = {
      id,
      object: clonedObject,
      name: `${layerToDuplicate.name} (copy)`,
      visible: true,
      locked: false,
      order: layers.length,
    };

    set({
      layers: [...layers, newLayer],
      selectedLayerId: id,
    });

    // Add to history
    const command: EditorCommand = {
      execute: () => {
        // Already executed
      },
      undo: () => {
        get().deleteLayer(id);
      },
      description: `Duplicate layer "${layerToDuplicate.name}"`,
    };
    get().executeCommand(command);

    if (state.isAutoSaveEnabled) {
      state.saveState();
    }
  },

  selectLayer: (layerId) => {
    const { canvas, layers } = get();
    if (!canvas) return;

    if (layerId) {
      const layer = layers.find((l) => l.id === layerId);
      if (layer && !layer.locked) {
        canvas.setActiveObject(layer.object);
        canvas.renderAll();
      }
    } else {
      canvas.discardActiveObject();
      canvas.renderAll();
    }

    set({ selectedLayerId: layerId });
  },

  reorderLayers: (fromIndex, toIndex) => {
    const state = get();
    const { canvas, layers } = state;
    if (!canvas) return;

    const newLayers = [...layers];
    const [movedLayer] = newLayers.splice(fromIndex, 1);
    newLayers.splice(toIndex, 0, movedLayer);

    // Update order property
    newLayers.forEach((layer, index) => {
      layer.order = index;
      // Canvas will automatically handle layer ordering based on the order of objects
    });

    canvas.renderAll();
    set({ layers: newLayers });

    if (state.isAutoSaveEnabled) {
      state.saveState();
    }
  },

  toggleLayerVisibility: (layerId) => {
    const state = get();
    const { canvas, layers } = state;
    if (!canvas) return;

    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;

    layer.visible = !layer.visible;
    layer.object.visible = layer.visible;
    canvas.renderAll();

    set({ layers: [...layers] });

    if (state.isAutoSaveEnabled) {
      state.saveState();
    }
  },

  toggleLayerLock: (layerId) => {
    const state = get();
    const { canvas, layers } = state;
    if (!canvas) return;

    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;

    layer.locked = !layer.locked;
    layer.object.selectable = !layer.locked;
    layer.object.evented = !layer.locked;

    if (layer.locked && state.selectedLayerId === layerId) {
      canvas.discardActiveObject();
      set({ selectedLayerId: null });
    }

    canvas.renderAll();
    set({ layers: [...layers] });

    if (state.isAutoSaveEnabled) {
      state.saveState();
    }
  },

  updateTextProperties: (layerId, properties) => {
    const state = get();
    const { canvas, layers } = state;
    if (!canvas) return;

    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;

    Object.entries(properties).forEach(([key, value]) => {
      if (key === 'textAlign') {
        layer.object.set('textAlign', value);
      } else if (key === 'opacity') {
        layer.object.set('opacity', value);
      } else if (key === 'lineHeight' && value !== undefined) {
        layer.object.set('lineHeight', value);
      } else if (key === 'charSpacing' && value !== undefined) {
        layer.object.set('charSpacing', value);
      } else {
        layer.object.set(key as keyof IText, value);
      }
    });

    canvas.renderAll();

    if (state.isAutoSaveEnabled) {
      state.saveState();
    }
  },

  executeCommand: (command) => {
    const state = get();
    const { history, historyIndex } = state;

    // Remove any commands after the current index
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(command);

    // Limit history size
    if (newHistory.length > EDITOR_CONSTANTS.HISTORY.MAX_STEPS) {
      newHistory.shift();
    }

    command.execute();

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < 0) return;

    const command = history[historyIndex];
    command.undo();

    set({ historyIndex: historyIndex - 1 });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;

    const command = history[historyIndex + 1];
    command.execute();

    set({ historyIndex: historyIndex + 1 });
  },

  canUndo: () => {
    const { historyIndex } = get();
    return historyIndex >= 0;
  },

  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },

  setAutoSave: (enabled) => {
    autoSaveService.setEnabled(enabled);
    set({ isAutoSaveEnabled: enabled });
  },

  saveState: () => {
    const state = get();
    const saveData = {
      layers: state.layers.map((layer) => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked,
        order: layer.order,
        text: layer.object.text,
        properties: {
          left: layer.object.left,
          top: layer.object.top,
          fontFamily: layer.object.fontFamily,
          fontSize: layer.object.fontSize,
          fontWeight: layer.object.fontWeight,
          fill: layer.object.fill,
          opacity: layer.object.opacity,
          textAlign: layer.object.textAlign,
          lineHeight: layer.object.lineHeight,
          charSpacing: layer.object.charSpacing,
          angle: layer.object.angle,
          scaleX: layer.object.scaleX,
          scaleY: layer.object.scaleY,
        },
      })),
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      originalImageWidth: state.originalImageWidth,
      originalImageHeight: state.originalImageHeight,
    };

    // Use the auto-save service which handles debouncing with timeout
    autoSaveService.save(saveData);
  },

  loadState: () => {
    const data = autoSaveService.load();
    if (!data) return;

    try {
      // Implementation will be added when canvas is ready
      console.log('Loaded state:', data);
    } catch (error) {
      console.error('Failed to load saved state:', error);
    }
  },

  resetState: () => {
    const state = get();
    autoSaveService.clear();
    state.clearCanvas();
    set({ ...initialState, canvas: state.canvas, zoomLevel: EDITOR_CONSTANTS.ZOOM.DEFAULT });
  },

  // Zoom actions
  setZoomLevel: (targetLevel) => {
    const { canvas, zoomLevel: currentLevel } = get();
    if (!canvas) return;

    // Clamp zoom level between min and max
    const clampedLevel = Math.max(
      EDITOR_CONSTANTS.ZOOM.MIN,
      Math.min(EDITOR_CONSTANTS.ZOOM.MAX, targetLevel)
    );

    // If very close to current level, just set it directly
    if (Math.abs(clampedLevel - currentLevel) < 0.001) {
      canvas.setZoom(clampedLevel);
      canvas.requestRenderAll();
      set({ zoomLevel: clampedLevel });
      return;
    }

    // Smooth zoom animation
    const startTime = Date.now();
    const duration = EDITOR_CONSTANTS.ZOOM.ANIMATION_DURATION;
    const startZoom = currentLevel;
    const deltaZoom = clampedLevel - startZoom;

    const animateZoom = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentZoom = startZoom + deltaZoom * easeOut;
      
      canvas.setZoom(currentZoom);
      canvas.requestRenderAll();
      set({ zoomLevel: currentZoom });

      if (progress < 1) {
        requestAnimationFrame(animateZoom);
      }
    };

    requestAnimationFrame(animateZoom);
  },

  zoomIn: () => {
    const { zoomLevel } = get();
    const newLevel = zoomLevel + EDITOR_CONSTANTS.ZOOM.STEP;
    get().setZoomLevel(newLevel);
  },

  zoomOut: () => {
    const { zoomLevel } = get();
    const newLevel = zoomLevel - EDITOR_CONSTANTS.ZOOM.STEP;
    get().setZoomLevel(newLevel);
  },

  resetZoom: () => {
    get().setZoomLevel(EDITOR_CONSTANTS.ZOOM.DEFAULT);
  },

  fitToWindow: () => {
    const { canvas, backgroundImage } = get();
    if (!canvas) return;

    // Calculate zoom to fit the canvas content in the viewport
    const canvasContainer = canvas.getElement().parentElement;
    if (!canvasContainer) return;

    const containerWidth = canvasContainer.clientWidth;
    const containerHeight = canvasContainer.clientHeight;
    
    // Use background image dimensions if available, otherwise use canvas dimensions
    const contentWidth = backgroundImage ? (backgroundImage as any).width : canvas.getWidth();
    const contentHeight = backgroundImage ? (backgroundImage as any).height : canvas.getHeight();

    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to leave some padding

    get().setZoomLevel(scale);
  },

  // Pan actions
  setPanning: (isPanning) => {
    const { canvas } = get();
    if (!canvas) return;

    set({ isPanning });
    
    if (isPanning) {
      canvas.defaultCursor = 'grab';
      canvas.hoverCursor = 'grab';
      // Disable selection while panning
      canvas.selection = false;
      canvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.evented = false;
      });
    } else {
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'move';
      // Re-enable selection
      canvas.selection = true;
      canvas.forEachObject((obj) => {
        const layer = get().layers.find(l => l.object === obj);
        if (layer) {
          obj.selectable = !layer.locked;
          obj.evented = !layer.locked;
        }
      });
    }
    
    canvas.requestRenderAll();
  },

  setViewportTransform: (transform) => {
    const { canvas } = get();
    if (!canvas) return;

    canvas.setViewportTransform(transform);
    set({ viewportTransform: transform });
  },

  resetViewport: () => {
    const { canvas } = get();
    if (!canvas) return;

    const defaultTransform = [1, 0, 0, 1, 0, 0];
    canvas.setViewportTransform(defaultTransform);
    set({ viewportTransform: defaultTransform, zoomLevel: 1 });
  },

  // Panel actions
  toggleLeftPanel: () => {
    set((state) => ({ leftPanelCollapsed: !state.leftPanelCollapsed }));
  },

  toggleLayersPanel: () => {
    set((state) => ({ layersPanelCollapsed: !state.layersPanelCollapsed }));
  },

  toggleHistoryPanel: () => {
    set((state) => ({ historyPanelCollapsed: !state.historyPanelCollapsed }));
  },

  toggleAllPanels: () => {
    const state = get();
    // If any panel is expanded, collapse all; otherwise expand all
    const anyExpanded = !state.leftPanelCollapsed || !state.layersPanelCollapsed || !state.historyPanelCollapsed;
    
    set({
      leftPanelCollapsed: anyExpanded,
      layersPanelCollapsed: anyExpanded,
      historyPanelCollapsed: anyExpanded,
    });
  },
}));