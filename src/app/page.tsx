'use client';

import { useEffect } from 'react';
import { EditorCanvas } from '@/components/editor/EditorCanvas';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { LayerPanel } from '@/components/editor/LayerPanel';
import { TextPropertiesPanel } from '@/components/editor/TextPropertiesPanel';
import { HistoryPanel } from '@/components/editor/HistoryPanel';
import { useEditorStore } from '@/lib/editor/store';
import { useAutoSave } from '@/hooks/editor/useAutoSave';

export default function Home() {
  const { undo, redo, canUndo, canRedo, loadState } = useEditorStore();
  useAutoSave();

  // Load saved state on mount
  useEffect(() => {
    loadState();
  }, [loadState]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      // Undo/Redo shortcuts
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (e.key === 'z' && canUndo()) {
          e.preventDefault();
          undo();
        } else if (e.key === 'y' && canRedo()) {
          e.preventDefault();
          redo();
        }
      }
      
      // Redo with Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z' && canRedo()) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <EditorToolbar />
      
      <div className="flex-1 flex overflow-hidden">
        <TextPropertiesPanel />
        
        <div className="flex-1 overflow-auto">
          <EditorCanvas />
        </div>
        
        <LayerPanel />
        <HistoryPanel />
      </div>
    </div>
  );
}