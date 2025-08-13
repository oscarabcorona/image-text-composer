'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EDITOR_CONSTANTS } from '@/lib/editor/constants';
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
  Keyboard
} from 'lucide-react';
import { useEditorStore } from '@/lib/editor/store';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import * as fabric from 'fabric';

export function EditorToolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
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
    zoomLevel,
    zoomIn,
    zoomOut,
    fitToWindow,
    setZoomLevel,
    isPanning,
    setPanning,
  } = useEditorStore();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvas) return;

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

  const handleAddText = () => {
    if (!canvas) return;
    addTextLayer('Add your text here');
  };

  const handleExport = async () => {
    if (!canvas) return;

    // Validate image dimensions before export
    if (originalImageWidth > EDITOR_CONSTANTS.CANVAS.MAX_WIDTH || originalImageHeight > EDITOR_CONSTANTS.CANVAS.MAX_HEIGHT) {
      alert(`Image too large: ${originalImageWidth}x${originalImageHeight}. Max supported: ${EDITOR_CONSTANTS.CANVAS.MAX_WIDTH}x${EDITOR_CONSTANTS.CANVAS.MAX_HEIGHT}`);
      return;
    }

    const exportButton = Array.from(document.querySelectorAll('button')).find(
      btn => btn.textContent?.includes('Export PNG')
    ) as HTMLButtonElement;
    const originalText = exportButton?.textContent;
    if (exportButton) {
      exportButton.disabled = true;
      exportButton.textContent = 'Exporting...';
    }

    try {
      // Check for reasonable canvas size limits
      const maxDimension = EDITOR_CONSTANTS.CANVAS.MAX_WIDTH;
      if (originalImageWidth > maxDimension || originalImageHeight > maxDimension) {
        throw new Error(`Image too large: ${originalImageWidth}x${originalImageHeight}. Max supported: ${maxDimension}x${maxDimension}`);
      }

      // Check if there are objects to export (beyond background)
      const objects = canvas.getObjects();
      const hasObjects = objects.length > 0;


      let dataURL: string;

      if (hasObjects) {
        // Store current state
        const currentZoom = canvas.getZoom();
        const currentVpt = canvas.viewportTransform ? [...canvas.viewportTransform] : [1, 0, 0, 1, 0, 0];

        // Reset canvas view for clean capture
        canvas.setZoom(1);
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        
        // Force synchronous render for export
        canvas.renderAll();

        // For many objects, use a more memory-efficient approach
        if (objects.length > 500) {
          // Create off-screen canvas for export
          const exportCanvas = document.createElement('canvas');
          exportCanvas.width = originalImageWidth;
          exportCanvas.height = originalImageHeight;
          const exportCtx = exportCanvas.getContext('2d', { 
            willReadFrequently: false,
            alpha: true 
          });

          if (!exportCtx) {
            throw new Error('Failed to create export canvas context');
          }

          // Fill background
          exportCtx.fillStyle = (canvas.backgroundColor as string) || '#ffffff';
          exportCtx.fillRect(0, 0, originalImageWidth, originalImageHeight);

          // Calculate scale
          const scale = Math.max(
            originalImageWidth / canvas.getWidth(),
            originalImageHeight / canvas.getHeight()
          );

          // Draw canvas content scaled
          exportCtx.save();
          exportCtx.scale(scale, scale);
          
          // Use drawImage for better performance with many objects
          const fabricCanvasElement = canvas.getElement();
          exportCtx.drawImage(
            fabricCanvasElement,
            0, 0,
            fabricCanvasElement.width,
            fabricCanvasElement.height,
            0, 0,
            fabricCanvasElement.width,
            fabricCanvasElement.height
          );
          
          exportCtx.restore();

          dataURL = exportCanvas.toDataURL('image/png', 1);
          exportCanvas.remove();
        } else {
          // For fewer objects, use standard approach
          // Check if canvas matches original dimensions
          if (canvas.getWidth() === originalImageWidth && canvas.getHeight() === originalImageHeight) {
            // Canvas already at target size, export directly
            dataURL = canvas.toDataURL({
              format: 'png',
              quality: 1,
              multiplier: 1,
              enableRetinaScaling: false
            });
          } else {
            // Canvas is different size, need to scale
            const multiplier = Math.max(
              originalImageWidth / canvas.getWidth(),
              originalImageHeight / canvas.getHeight()
            );
            
            dataURL = canvas.toDataURL({
              format: 'png',
              quality: 1,
              multiplier: multiplier,
              enableRetinaScaling: false
            });
          }
        }

        // Restore original canvas state
        canvas.setZoom(currentZoom);
        canvas.setViewportTransform(currentVpt as fabric.TMat2D);
        canvas.renderAll();

      } else {
        
        // Store current state and reset for clean capture
        const currentZoom = canvas.getZoom();
        const currentVpt = canvas.viewportTransform ? [...canvas.viewportTransform] : [1, 0, 0, 1, 0, 0];

        // Reset canvas view for clean export
        canvas.setZoom(1);
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        canvas.renderAll();

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = originalImageWidth;
        exportCanvas.height = originalImageHeight;
        const exportCtx = exportCanvas.getContext('2d');

        if (!exportCtx) {
          throw new Error('Failed to create export canvas context');
        }

        
        // Use Fabric.js toDataURL with multiplier to get exact dimensions
        const fabricDataURL = canvas.toDataURL({
          format: 'png',
          quality: 1,
          multiplier: originalImageWidth / canvas.getWidth(), // Scale to exact target width
          width: originalImageWidth,
          height: originalImageHeight
        });


        // Load the fabric export into our export canvas to verify dimensions
        const img = new Image();
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            // Fill background color first
            exportCtx.fillStyle = (canvas.backgroundColor as string) || '#ffffff';
            exportCtx.fillRect(0, 0, originalImageWidth, originalImageHeight);
            
            // Draw the fabric export to our export canvas
            exportCtx.drawImage(img, 0, 0, originalImageWidth, originalImageHeight);
            resolve();
          };
          
          img.onerror = () => reject(new Error('Failed to load fabric export'));
          img.src = fabricDataURL;
        });

        // Generate final data URL from our verified export canvas
        dataURL = exportCanvas.toDataURL('image/png', 1);

        // Restore original canvas state
        canvas.setZoom(currentZoom);
        canvas.setViewportTransform(currentVpt as fabric.TMat2D);
        canvas.renderAll();

        // Clean up
        exportCanvas.remove();
      }

      if (!dataURL || dataURL.length < 100) {
        throw new Error('Generated data URL is invalid or empty');
      }

      // Verify exported image dimensions
      const verificationImg = new Image();
      await new Promise<void>((resolve) => {
        verificationImg.onload = () => {
          const dimensionsMatch = (
            verificationImg.naturalWidth === originalImageWidth && 
            verificationImg.naturalHeight === originalImageHeight
          );
          
          if (!dimensionsMatch) {
            console.error('Export dimensions mismatch:', {
              expected: `${originalImageWidth}x${originalImageHeight}`,
              actual: `${verificationImg.naturalWidth}x${verificationImg.naturalHeight}`
            });
          }
          resolve();
        };
        verificationImg.onerror = () => {
          resolve();
        };
        verificationImg.src = dataURL;
      });

      // Create download link
      const link = document.createElement('a');
      link.download = 'image-text-composition.png';
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);


    } catch (error) {
      console.error('💥 Export failed:', error);
      
      // Try fallback method if the main export fails
      if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('callback never fired'))) {
        console.log('🔄 Attempting fallback export method...');
        try {
          // Fallback: Use direct canvas copying method
          const currentZoom = canvas.getZoom();
          const currentVpt = canvas.viewportTransform ? [...canvas.viewportTransform] : [1, 0, 0, 1, 0, 0];

          // Reset canvas view for clean export
          canvas.setZoom(1);
          canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
          canvas.renderAll();

          // Create export canvas with original dimensions
          const exportCanvas = document.createElement('canvas');
          exportCanvas.width = originalImageWidth;
          exportCanvas.height = originalImageHeight;
          const exportCtx = exportCanvas.getContext('2d');

          if (exportCtx) {
            // Fill background
            exportCtx.fillStyle = (canvas.backgroundColor as string) || '#ffffff';
            exportCtx.fillRect(0, 0, originalImageWidth, originalImageHeight);

            // Draw the canvas content with precise dimensions using ACTUAL source dimensions
            const fabricCanvasElement = canvas.getElement();
            const actualSourceWidth = fabricCanvasElement.width;
            const actualSourceHeight = fabricCanvasElement.height;
            
            exportCtx.drawImage(
              fabricCanvasElement,     // source
              0, 0,                   // source x, y
              actualSourceWidth, actualSourceHeight,  // ACTUAL source width, height  
              0, 0,                   // destination x, y
              originalImageWidth, originalImageHeight  // destination width, height
            );
            
            console.log(`🔄 Fallback: Drew source (${actualSourceWidth}x${actualSourceHeight}) to target (${originalImageWidth}x${originalImageHeight})`);

            // Generate data URL
            const dataURL = exportCanvas.toDataURL('image/png', 1);

            // Restore original canvas state
            canvas.setZoom(currentZoom);
            canvas.setViewportTransform(currentVpt as fabric.TMat2D);
            canvas.renderAll();

            // Clean up
            exportCanvas.remove();

            if (dataURL && dataURL.length > 100) {
              // Create download link
              const link = document.createElement('a');
              link.download = 'image-text-composition.png';
              link.href = dataURL;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              console.log('✅ Fallback export completed successfully!');
              return; // Success, exit early
            }
          }
        } catch (fallbackError) {
          console.error('💥 Fallback export also failed:', fallbackError);
        }
      }
      
      // Provide specific error messages
      let errorMessage = 'Failed to export image. ';
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage += 'The image is too complex or large. Try reducing the image size or removing some elements.';
        } else if (error.message.includes('too large')) {
          errorMessage += error.message;
        } else if (error.message.includes('memory')) {
          errorMessage += 'Not enough memory to export. Try reducing the number of text layers or image size.';
        } else {
          errorMessage += 'Please try again or contact support if the problem persists.';
        }
      } else {
        errorMessage += 'Unknown error occurred.';
      }
      
      alert(errorMessage);
    } finally {
      // Restore export button
      if (exportButton && originalText) {
        exportButton.disabled = false;
        exportButton.textContent = originalText;
      }
    }
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
            <span className="text-xs text-gray-500 ml-1">(or drag & drop)</span>
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
            disabled={!canvas || zoomLevel <= EDITOR_CONSTANTS.ZOOM.MIN}
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
            disabled={!canvas || zoomLevel >= EDITOR_CONSTANTS.ZOOM.MAX}
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
            title="Pan mode (Hold Alt)"
          >
            <Hand className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-gray-300 mx-2" />

          {/* Keyboard Shortcuts */}
          <Popover open={showShortcuts} onOpenChange={setShowShortcuts}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                title="Keyboard shortcuts"
              >
                <Keyboard className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm mb-2">Keyboard Shortcuts</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Undo</span>
                    <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">Ctrl/Cmd + Z</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Redo</span>
                    <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">Ctrl/Cmd + Y</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Redo (alt)</span>
                    <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">Ctrl/Cmd + Shift + Z</kbd>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between">
                    <span className="text-gray-600">Zoom In</span>
                    <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">Ctrl/Cmd + Plus</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Zoom Out</span>
                    <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">Ctrl/Cmd + Minus</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reset Zoom</span>
                    <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">Ctrl/Cmd + 0</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fit to Window</span>
                    <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">Ctrl/Cmd + 9</kbd>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pan Mode</span>
                    <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">Hold Alt</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nudge Text</span>
                    <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">Arrow Keys</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nudge Faster</span>
                    <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">Shift + Arrow Keys</kbd>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between">
                    <span className="text-gray-600">Toggle All Panels</span>
                    <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">Ctrl/Cmd + B</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duplicate Layer</span>
                    <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">Ctrl/Cmd + D</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delete Layer</span>
                    <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">Delete</kbd>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
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
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
              </svg>
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