import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/lib/editor/store';
import { EDITOR_CONSTANTS } from '@/lib/editor/constants';

export function useAutoSave() {
  const { isAutoSaveEnabled, saveState, layers, backgroundImage } = useEditorStore();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAutoSaveEnabled) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      saveState();
    }, EDITOR_CONSTANTS.AUTOSAVE.DEBOUNCE_MS);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isAutoSaveEnabled, saveState, layers, backgroundImage]);
}