'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Upload, 
  Type, 
  Download, 
  Undo2, 
  Redo2, 
  RotateCcw,
  Save,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Hand,
  Github
} from 'lucide-react';
import { useEditorStore } from '@/lib/editor/store';
// Removed fabric import as we'll pass data URL directly

export function EditorToolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    canvas,
    setBackgroundImage,
    addTextLayer,
    undo,
    redo,
    canUndo,
    canRedo,
    resetState,
    isAutoSaveEnabled,
    setAutoSave,
    originalImageWidth,
    originalImageHeight,
    canvasWidth,
    canvasHeight,
    zoomLevel,
    zoomIn,
    zoomOut,
    fitToWindow,
    resetZoom,
    setZoomLevel,
    isPanning,
    setPanning,
  } = useEditorStore();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvas) return;

    // Validate file type - accept common image formats
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (PNG, JPEG, GIF, or WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target?.result as string;
      
      // Pass the data URL directly to setBackgroundImage
      // The store will handle loading and scaling
      setBackgroundImage(imgUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleAddText = () => {
    if (!canvas) return;
    addTextLayer('Add your text here');
  };

  const handleExport = () => {
    if (!canvas) return;

    // Calculate multiplier to export at original image dimensions
    const multiplierX = originalImageWidth / canvasWidth;
    const multiplierY = originalImageHeight / canvasHeight;
    const multiplier = Math.max(multiplierX, multiplierY);

    // Get the canvas as data URL at original dimensions
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: multiplier,
    });

    // Create download link
    const link = document.createElement('a');
    link.download = 'image-text-composition.png';
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset? This will clear all your work.')) {
      resetState();
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Upload Image */}
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            onChange={handleImageUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Image
          </Button>

          {/* Add Text */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddText}
            disabled={!canvas}
            className="gap-2"
          >
            <Type className="h-4 w-4" />
            Add Text
          </Button>

          <div className="h-6 w-px bg-gray-300 mx-2" />

          {/* Undo/Redo */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => undo()}
            disabled={!canUndo()}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => redo()}
            disabled={!canRedo()}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-gray-300 mx-2" />

          {/* Auto-save toggle */}
          <Button
            variant={isAutoSaveEnabled ? "default" : "ghost"}
            size="sm"
            onClick={() => setAutoSave(!isAutoSaveEnabled)}
            className="gap-2"
            title={isAutoSaveEnabled ? "Auto-save enabled" : "Auto-save disabled"}
          >
            <Save className="h-4 w-4" />
            Auto-save
          </Button>

          <div className="h-6 w-px bg-gray-300 mx-2" />

          {/* Zoom controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            disabled={!canvas || zoomLevel <= 0.1}
            title="Zoom out (Ctrl+-)"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>

          <div className="relative">
            <select
              value={
                [0.25, 0.5, 0.75, 1, 1.5, 2].includes(zoomLevel)
                  ? zoomLevel.toString()
                  : 'custom'
              }
              onChange={(e) => {
                if (e.target.value !== 'custom') {
                  setZoomLevel(parseFloat(e.target.value));
                }
              }}
              className="h-8 px-2 pr-8 text-sm border border-gray-300 rounded-md appearance-none"
              disabled={!canvas}
            >
              <option value="0.25">25%</option>
              <option value="0.5">50%</option>
              <option value="0.75">75%</option>
              <option value="1">100%</option>
              <option value="1.5">150%</option>
              <option value="2">200%</option>
              {![0.25, 0.5, 0.75, 1, 1.5, 2].includes(zoomLevel) && (
                <option value="custom">{Math.round(zoomLevel * 100)}%</option>
              )}
            </select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            disabled={!canvas || zoomLevel >= 3}
            title="Zoom in (Ctrl++)"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={fitToWindow}
            disabled={!canvas}
            title="Fit to window (Ctrl+9)"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-gray-300 mx-2" />

          <Button
            variant={isPanning ? "default" : "ghost"}
            size="sm"
            onClick={() => setPanning(!isPanning)}
            disabled={!canvas}
            title="Pan mode (Hold Space)"
          >
            <Hand className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* GitHub Link */}
          <a
            href="https://github.com/oscarabcorona/image-text-composer"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
          >
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              title="View on GitHub"
            >
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">GitHub</span>
            </Button>
          </a>

          <div className="h-6 w-px bg-gray-300 mx-2" />

          {/* Reset */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-2 text-red-600 hover:text-red-700"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>

          {/* Export */}
          <Button
            variant="default"
            size="sm"
            onClick={handleExport}
            disabled={!canvas}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export PNG
          </Button>
        </div>
      </div>
    </div>
  );
}