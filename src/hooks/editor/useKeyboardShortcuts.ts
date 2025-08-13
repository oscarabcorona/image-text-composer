import { useEffect } from 'react';
import { IServiceProvider } from '@/types/services';
import { EDITOR_CONSTANTS } from '@/lib/editor/constants';

interface UseKeyboardShortcutsProps {
  services: IServiceProvider;
  enabled?: boolean;
}

/**
 * Hook to handle keyboard shortcuts
 * DRY: Centralizes keyboard handling logic
 */
export function useKeyboardShortcuts({
  services,
  enabled = true,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const canvas = services.canvas.getCanvas();
      if (!canvas) return;

      // Check if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      // Handle undo/redo
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey && services.history.canUndo()) {
          e.preventDefault();
          services.history.undo();
          return;
        }
        if (e.key === 'y' && services.history.canRedo()) {
          e.preventDefault();
          services.history.redo();
          return;
        }
        if (e.key === 'Z' && e.shiftKey && services.history.canRedo()) {
          e.preventDefault();
          services.history.redo();
          return;
        }
      }

      // Handle arrow key nudging
      const activeObject = canvas.getActiveObject();
      if (!activeObject) return;

      const nudgeDistance = e.shiftKey
        ? EDITOR_CONSTANTS.KEYBOARD.NUDGE_DISTANCE_SHIFT
        : EDITOR_CONSTANTS.KEYBOARD.NUDGE_DISTANCE;

      let moved = false;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          activeObject.set('top', (activeObject.top || 0) - nudgeDistance);
          moved = true;
          break;
        case 'ArrowDown':
          e.preventDefault();
          activeObject.set('top', (activeObject.top || 0) + nudgeDistance);
          moved = true;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          activeObject.set('left', (activeObject.left || 0) - nudgeDistance);
          moved = true;
          break;
        case 'ArrowRight':
          e.preventDefault();
          activeObject.set('left', (activeObject.left || 0) + nudgeDistance);
          moved = true;
          break;
      }

      if (moved) {
        services.canvas.render();
        services.autoSave.save(services.layers.getAllLayers());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [services, enabled]);
}