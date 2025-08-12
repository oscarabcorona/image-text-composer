import { IText } from 'fabric';
import { ITextService } from '@/types/services';
import { TextProperties } from '@/types/editor';
import { EDITOR_CONSTANTS } from '../constants';

export class TextService implements ITextService {
  createText(text: string, properties?: Partial<TextProperties>): IText {
    const defaultProperties: TextProperties = {
      fontFamily: EDITOR_CONSTANTS.TEXT.DEFAULT_FONT_FAMILY,
      fontSize: EDITOR_CONSTANTS.TEXT.DEFAULT_FONT_SIZE,
      fontWeight: EDITOR_CONSTANTS.TEXT.DEFAULT_FONT_WEIGHT,
      fill: EDITOR_CONSTANTS.TEXT.DEFAULT_COLOR,
      opacity: EDITOR_CONSTANTS.TEXT.DEFAULT_OPACITY,
      textAlign: 'left',
    };

    const mergedProperties = { ...defaultProperties, ...properties };

    return new IText(text, {
      ...mergedProperties,
      originX: 'center',
      originY: 'center',
    });
  }

  updateTextProperties(object: IText, properties: Partial<TextProperties>): void {
    Object.entries(properties).forEach(([key, value]) => {
      if (value === undefined) return;
      
      switch (key) {
        case 'textAlign':
          object.set('textAlign', value as string);
          break;
        case 'opacity':
          object.set('opacity', value as number);
          break;
        case 'lineHeight':
          object.set('lineHeight', value as number);
          break;
        case 'charSpacing':
          object.set('charSpacing', value as number);
          break;
        default:
          object.set(key as keyof IText, value);
      }
    });
  }

  getTextProperties(object: IText): TextProperties {
    return {
      fontFamily: object.fontFamily || EDITOR_CONSTANTS.TEXT.DEFAULT_FONT_FAMILY,
      fontSize: object.fontSize || EDITOR_CONSTANTS.TEXT.DEFAULT_FONT_SIZE,
      fontWeight: object.fontWeight || EDITOR_CONSTANTS.TEXT.DEFAULT_FONT_WEIGHT,
      fill: (object.fill as string) || EDITOR_CONSTANTS.TEXT.DEFAULT_COLOR,
      opacity: object.opacity || EDITOR_CONSTANTS.TEXT.DEFAULT_OPACITY,
      textAlign: (object.textAlign as 'left' | 'center' | 'right') || 'left',
      lineHeight: object.lineHeight,
      charSpacing: object.charSpacing,
    };
  }
}