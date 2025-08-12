import { create } from 'zustand';
import { ServiceProvider } from './services/ServiceProvider';
import { CommandFactory } from './commands/CommandFactory';
import { TextLayer } from '@/types/editor';

/**
 * Refactored store following Single Responsibility Principle
 * The store now only manages state and delegates operations to services
 */
interface EditorState {
  services: ServiceProvider | null;
  commandFactory: CommandFactory | null;
  selectedLayerId: string | null;
  layers: TextLayer[];
  isAutoSaveEnabled: boolean;
}

interface EditorActions {
  initializeServices: (canvas: HTMLCanvasElement) => void;
  setSelectedLayerId: (layerId: string | null) => void;
  setLayers: (layers: TextLayer[]) => void;
  setAutoSaveEnabled: (enabled: boolean) => void;
  dispose: () => void;
}

export const useEditorStoreRefactored = create<EditorState & EditorActions>((set, get) => ({
  // State
  services: null,
  commandFactory: null,
  selectedLayerId: null,
  layers: [],
  isAutoSaveEnabled: true,

  // Actions
  initializeServices: (canvas: HTMLCanvasElement) => {
    const state = get();
    
    // Dispose existing services
    if (state.services) {
      state.services.dispose();
    }

    // Create new services
    const services = new ServiceProvider();
    services.initialize(canvas);
    
    const commandFactory = new CommandFactory(services);

    set({
      services,
      commandFactory,
    });
  },

  setSelectedLayerId: (layerId) => {
    set({ selectedLayerId: layerId });
  },

  setLayers: (layers) => {
    set({ layers });
  },

  setAutoSaveEnabled: (enabled) => {
    const { services } = get();
    if (services) {
      services.autoSave.setEnabled(enabled);
    }
    set({ isAutoSaveEnabled: enabled });
  },

  dispose: () => {
    const { services } = get();
    if (services) {
      services.dispose();
    }
    set({
      services: null,
      commandFactory: null,
      selectedLayerId: null,
      layers: [],
    });
  },
}))