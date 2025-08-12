import { Object as FabricObject, Line } from 'fabric';
import { ISnapService, ICanvasService } from '@/types/services';
import { EDITOR_CONSTANTS } from '../constants';
import { 
  createCenterLine, 
  getObjectCenter, 
  isNearCenter,
  setObjectCenterPosition 
} from '../utils/canvasUtils';

export class SnapService implements ISnapService {
  private enabled: boolean = true;
  private threshold: number = EDITOR_CONSTANTS.SNAP.THRESHOLD;
  private centerLineX: Line | null = null;
  private centerLineY: Line | null = null;

  constructor(private canvasService: ICanvasService) {
    this.setupEventListeners();
  }

  enableSnapping(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearSnapLines();
    }
  }

  setSnapThreshold(threshold: number): void {
    this.threshold = threshold;
  }

  checkSnap(object: FabricObject): { x: number; y: number } | null {
    if (!this.enabled) return null;

    const canvas = this.canvasService.getCanvas();
    if (!canvas) return null;

    const canvasWidth = canvas.width || 0;
    const canvasHeight = canvas.height || 0;
    const objectCenter = getObjectCenter(object);
    const canvasCenterX = canvasWidth / 2;
    const canvasCenterY = canvasHeight / 2;

    let snappedX = false;
    let snappedY = false;

    // Check horizontal center snap
    if (isNearCenter(objectCenter.x, canvasCenterX, this.threshold)) {
      setObjectCenterPosition(object, canvasCenterX, objectCenter.y);
      snappedX = true;
      this.showVerticalCenterLine(canvasWidth, canvasHeight);
    } else {
      this.hideVerticalCenterLine();
    }

    // Check vertical center snap
    if (isNearCenter(objectCenter.y, canvasCenterY, this.threshold)) {
      const currentCenterX = getObjectCenter(object).x;
      setObjectCenterPosition(object, currentCenterX, canvasCenterY);
      snappedY = true;
      this.showHorizontalCenterLine(canvasWidth, canvasHeight);
    } else {
      this.hideHorizontalCenterLine();
    }

    return snappedX || snappedY 
      ? { x: object.left || 0, y: object.top || 0 }
      : null;
  }

  private setupEventListeners(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    canvas.on('object:moving', (e) => {
      if (e.target) {
        this.checkSnap(e.target);
      }
    });

    canvas.on('object:modified', () => {
      this.clearSnapLines();
    });
  }

  private showVerticalCenterLine(canvasWidth: number, canvasHeight: number): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    if (!this.centerLineX) {
      this.centerLineX = createCenterLine('horizontal', canvasWidth, canvasHeight);
      canvas.add(this.centerLineX);
    }
  }

  private showHorizontalCenterLine(canvasWidth: number, canvasHeight: number): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;

    if (!this.centerLineY) {
      this.centerLineY = createCenterLine('vertical', canvasWidth, canvasHeight);
      canvas.add(this.centerLineY);
    }
  }

  private hideVerticalCenterLine(): void {
    if (!this.centerLineX) return;

    const canvas = this.canvasService.getCanvas();
    if (canvas) {
      canvas.remove(this.centerLineX);
    }
    this.centerLineX = null;
  }

  private hideHorizontalCenterLine(): void {
    if (!this.centerLineY) return;

    const canvas = this.canvasService.getCanvas();
    if (canvas) {
      canvas.remove(this.centerLineY);
    }
    this.centerLineY = null;
  }

  private clearSnapLines(): void {
    this.hideVerticalCenterLine();
    this.hideHorizontalCenterLine();
  }

  dispose(): void {
    this.clearSnapLines();
  }
}