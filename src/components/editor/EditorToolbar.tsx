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
  Save
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
        </div>

        <div className="flex items-center gap-2">
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