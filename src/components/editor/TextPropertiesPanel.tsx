'use client';

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlignLeft, AlignCenter, AlignRight, Type, ChevronLeft } from 'lucide-react';
import { useEditorStore } from '@/lib/editor/store';
import { FontSelector } from './FontSelector';
import { EDITOR_CONSTANTS, FONT_WEIGHTS } from '@/lib/editor/constants';
import { TextProperties } from '@/types/editor';
import * as fabric from 'fabric';

export function TextPropertiesPanel() {
  const { layers, selectedLayerId, updateTextProperties, canvas, leftPanelCollapsed, toggleLeftPanel } = useEditorStore();
  const selectedLayer = layers.find((l) => l.id === selectedLayerId);
  
  const [localText, setLocalText] = useState('');
  const [properties, setProperties] = useState<TextProperties>({
    fontFamily: EDITOR_CONSTANTS.TEXT.DEFAULT_FONT_FAMILY,
    fontSize: EDITOR_CONSTANTS.TEXT.DEFAULT_FONT_SIZE,
    fontWeight: EDITOR_CONSTANTS.TEXT.DEFAULT_FONT_WEIGHT,
    fill: EDITOR_CONSTANTS.TEXT.DEFAULT_COLOR,
    opacity: EDITOR_CONSTANTS.TEXT.DEFAULT_OPACITY,
    textAlign: 'left',
  });

  // Update local state when selection changes
  useEffect(() => {
    if (selectedLayer) {
      const obj = selectedLayer.object;
      setLocalText(obj.text || '');
      setProperties({
        fontFamily: obj.fontFamily || EDITOR_CONSTANTS.TEXT.DEFAULT_FONT_FAMILY,
        fontSize: obj.fontSize || EDITOR_CONSTANTS.TEXT.DEFAULT_FONT_SIZE,
        fontWeight: obj.fontWeight || EDITOR_CONSTANTS.TEXT.DEFAULT_FONT_WEIGHT,
        fill: obj.fill as string || EDITOR_CONSTANTS.TEXT.DEFAULT_COLOR,
        opacity: obj.opacity || EDITOR_CONSTANTS.TEXT.DEFAULT_OPACITY,
        textAlign: obj.textAlign as 'left' | 'center' | 'right' || 'left',
        lineHeight: obj.lineHeight,
        charSpacing: obj.charSpacing,
        shadowColor: (obj.shadow as fabric.Shadow)?.color || '#000000',
        shadowBlur: (obj.shadow as fabric.Shadow)?.blur || 0,
        shadowOffsetX: (obj.shadow as fabric.Shadow)?.offsetX || 0,
        shadowOffsetY: (obj.shadow as fabric.Shadow)?.offsetY || 0,
      });
    }
  }, [selectedLayer]);

  const updateProperty = <K extends keyof TextProperties>(
    key: K,
    value: TextProperties[K]
  ) => {
    if (!selectedLayerId) return;
    
    const newProperties = { ...properties, [key]: value };
    setProperties(newProperties);
    updateTextProperties(selectedLayerId, { [key]: value });
  };

  const updateText = (text: string) => {
    if (!selectedLayer || !canvas) return;
    
    setLocalText(text);
    selectedLayer.object.set('text', text);
    canvas.renderAll();
  };

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-300 ${
      leftPanelCollapsed ? 'w-12' : 'w-80'
    }`}>
      <div className={`border-b border-gray-200 ${leftPanelCollapsed ? 'p-2' : 'p-4'}`}>
        {leftPanelCollapsed ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLeftPanel}
            className="w-full p-0 h-8"
            title="Expand text properties"
          >
            <Type className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Type className="h-4 w-4" />
              Text Properties
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLeftPanel}
              className="h-6 w-6 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {!leftPanelCollapsed && (
        selectedLayer ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Text Content */}
        <div className="space-y-2">
          <Label>Text Content</Label>
          <Textarea
            value={localText}
            onChange={(e) => updateText(e.target.value)}
            placeholder="Enter your text..."
            className="min-h-[80px] resize-none"
          />
        </div>

        {/* Font Family */}
        <div className="space-y-2">
          <Label>Font Family</Label>
          <FontSelector
            value={properties.fontFamily}
            onChange={(font) => updateProperty('fontFamily', font)}
          />
        </div>

        {/* Font Size */}
        <div className="space-y-2">
          <Label>Font Size</Label>
          <div className="flex items-center gap-2">
            <Slider
              value={[properties.fontSize]}
              onValueChange={([value]) => updateProperty('fontSize', value)}
              min={EDITOR_CONSTANTS.TEXT.MIN_FONT_SIZE}
              max={EDITOR_CONSTANTS.TEXT.MAX_FONT_SIZE}
              step={1}
              className="flex-1"
            />
            <Input
              type="number"
              value={properties.fontSize}
              onChange={(e) => updateProperty('fontSize', parseInt(e.target.value) || 24)}
              className="w-16"
              min={EDITOR_CONSTANTS.TEXT.MIN_FONT_SIZE}
              max={EDITOR_CONSTANTS.TEXT.MAX_FONT_SIZE}
            />
          </div>
        </div>

        {/* Font Weight */}
        <div className="space-y-2">
          <Label>Font Weight</Label>
          <Select
            value={properties.fontWeight.toString()}
            onValueChange={(value) => updateProperty('fontWeight', parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_WEIGHTS.map((weight) => (
                <SelectItem key={weight.value} value={weight.value.toString()}>
                  {weight.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Color */}
        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={properties.fill}
              onChange={(e) => updateProperty('fill', e.target.value)}
              className="w-16 h-10 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={properties.fill}
              onChange={(e) => updateProperty('fill', e.target.value)}
              placeholder="#000000"
              className="flex-1"
            />
          </div>
        </div>

        {/* Opacity */}
        <div className="space-y-2">
          <Label>Opacity</Label>
          <div className="flex items-center gap-2">
            <Slider
              value={[properties.opacity * 100]}
              onValueChange={([value]) => updateProperty('opacity', value / 100)}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-sm w-12 text-right">{Math.round(properties.opacity * 100)}%</span>
          </div>
        </div>

        {/* Text Align */}
        <div className="space-y-2">
          <Label>Text Alignment</Label>
          <div className="flex gap-1">
            <Button
              variant={properties.textAlign === 'left' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateProperty('textAlign', 'left')}
              className="flex-1"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={properties.textAlign === 'center' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateProperty('textAlign', 'center')}
              className="flex-1"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              variant={properties.textAlign === 'right' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateProperty('textAlign', 'right')}
              className="flex-1"
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Line Height */}
        <div className="space-y-2">
          <Label>Line Height</Label>
          <div className="flex items-center gap-2">
            <Slider
              value={[properties.lineHeight || 1.2]}
              onValueChange={([value]) => updateProperty('lineHeight', value)}
              min={0.5}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <span className="text-sm w-12 text-right">{(properties.lineHeight || 1.2).toFixed(1)}</span>
          </div>
        </div>

        {/* Letter Spacing */}
        <div className="space-y-2">
          <Label>Letter Spacing</Label>
          <div className="flex items-center gap-2">
            <Slider
              value={[properties.charSpacing || 0]}
              onValueChange={([value]) => updateProperty('charSpacing', value)}
              min={-200}
              max={800}
              step={10}
              className="flex-1"
            />
            <span className="text-sm w-12 text-right">{properties.charSpacing || 0}</span>
          </div>
        </div>

        {/* Shadow Section */}
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium mb-3">Text Shadow</h4>
          
          {/* Shadow Color */}
          <div className="space-y-2">
            <Label>Shadow Color</Label>
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded border cursor-pointer"
                style={{ backgroundColor: properties.shadowColor || '#000000' }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'color';
                  input.value = properties.shadowColor || '#000000';
                  input.onchange = (e) => {
                    updateProperty('shadowColor', (e.target as HTMLInputElement).value);
                  };
                  input.click();
                }}
              />
              <Input
                type="text"
                value={properties.shadowColor || '#000000'}
                onChange={(e) => updateProperty('shadowColor', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          {/* Shadow Blur */}
          <div className="space-y-2 mt-3">
            <Label>Shadow Blur</Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[properties.shadowBlur || 0]}
                onValueChange={([value]) => updateProperty('shadowBlur', value)}
                min={0}
                max={50}
                step={1}
                className="flex-1"
              />
              <span className="text-sm w-12 text-right">{properties.shadowBlur || 0}</span>
            </div>
          </div>

          {/* Shadow Offset X */}
          <div className="space-y-2 mt-3">
            <Label>Shadow Offset X</Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[properties.shadowOffsetX || 0]}
                onValueChange={([value]) => updateProperty('shadowOffsetX', value)}
                min={-50}
                max={50}
                step={1}
                className="flex-1"
              />
              <span className="text-sm w-12 text-right">{properties.shadowOffsetX || 0}</span>
            </div>
          </div>

          {/* Shadow Offset Y */}
          <div className="space-y-2 mt-3">
            <Label>Shadow Offset Y</Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[properties.shadowOffsetY || 0]}
                onValueChange={([value]) => updateProperty('shadowOffsetY', value)}
                min={-50}
                max={50}
                step={1}
                className="flex-1"
              />
              <span className="text-sm w-12 text-right">{properties.shadowOffsetY || 0}</span>
            </div>
          </div>
        </div>
        </div>
        ) : (
          <div className="p-4">
            <p className="text-sm text-gray-500 text-center py-8">
              Select a text layer to edit its properties
            </p>
          </div>
        )
      )}
    </div>
  );
}