'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { History, Undo2, Redo2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEditorStore } from '@/lib/editor/store';
import { cn } from '@/lib/utils';

export function HistoryPanel() {
  const {
    history,
    historyIndex,
    undo,
    redo,
    canUndo,
    canRedo,
    historyPanelCollapsed,
    toggleHistoryPanel,
  } = useEditorStore();

  return (
    <div className={`bg-white border-l border-gray-200 flex flex-col transition-all duration-300 ${
      historyPanelCollapsed ? 'w-12' : 'w-64'
    }`} data-testid="history-panel">
      {/* Header */}
      <div className={`border-b border-gray-200 ${historyPanelCollapsed ? 'p-2' : 'p-4'}`}>
        {historyPanelCollapsed ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleHistoryPanel}
            className="w-full p-0 h-8 relative"
            title="Expand history"
          >
            <History className="h-4 w-4" />
            {history.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {history.length}
              </span>
            )}
          </Button>
        ) : (
          <> 
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </h3>
            <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={undo}
              disabled={!canUndo()}
              title="Undo (Ctrl+Z)"
              className="h-8 w-8"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={redo}
              disabled={!canRedo()}
              title="Redo (Ctrl+Y)"
              className="h-8 w-8"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleHistoryPanel}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {history.length} action{history.length !== 1 ? 's' : ''} • 
            Step {historyIndex + 1} of {history.length}
          </p>
          </>
        )}
      </div>

      {/* History List */}
      {!historyPanelCollapsed && (
        <ScrollArea className="flex-1">
        <div className="p-2">
          {history.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No history yet
            </p>
          ) : (
            <div className="space-y-1">
              {history.map((command, index) => (
                <button
                  key={index}
                  data-testid="history-item"
                  onClick={() => {
                    // Jump to this point in history
                    if (index > historyIndex) {
                      // Redo to this point
                      for (let i = historyIndex; i < index; i++) {
                        redo();
                      }
                    } else if (index < historyIndex) {
                      // Undo to this point
                      for (let i = historyIndex; i > index; i--) {
                        undo();
                      }
                    }
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm rounded-md transition-colors',
                    'hover:bg-gray-100',
                    index === historyIndex
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : index > historyIndex
                      ? 'text-gray-400'
                      : 'text-gray-700'
                  )}
                  disabled={history.length === 0}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{command.description}</span>
                    <span className="text-xs opacity-50 ml-2">
                      {index + 1}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        </ScrollArea>
      )}

      {/* Footer */}
      {!historyPanelCollapsed && (
        <div className="p-3 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          {historyIndex >= 0 ? (
            <>Current: {history[historyIndex]?.description}</>
          ) : (
            'Initial state'
          )}
        </p>
        </div>
      )}
    </div>
  );
}