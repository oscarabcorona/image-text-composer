import { IServiceProvider } from '@/types/services';
import { CanvasService } from './CanvasService';
import { LayerService } from './LayerService';
import { TextService } from './TextService';
import { HistoryService } from './HistoryService';
import { AutoSaveService } from './AutoSaveService';
import { SelectionService } from './SelectionService';
import { SnapService } from './SnapService';

/**
 * Service Provider implementing Dependency Injection Container
 * Following Single Responsibility and Dependency Inversion principles
 */
export class ServiceProvider implements IServiceProvider {
  public readonly canvas: CanvasService;
  public readonly layers: LayerService;
  public readonly text: TextService;
  public readonly history: HistoryService;
  public readonly autoSave: AutoSaveService;
  public readonly selection: SelectionService;
  public readonly snap: SnapService;

  constructor() {
    // Initialize services with dependencies
    this.canvas = new CanvasService();
    this.layers = new LayerService(this.canvas);
    this.text = new TextService();
    this.history = new HistoryService();
    this.autoSave = new AutoSaveService();
    this.selection = new SelectionService(this.canvas, this.layers);
    this.snap = new SnapService(this.canvas);
  }

  /**
   * Initialize all services with a canvas element
   */
  initialize(canvasElement: HTMLCanvasElement): void {
    this.canvas.initialize(canvasElement);
  }

  /**
   * Dispose all services and clean up resources
   */
  dispose(): void {
    this.autoSave.dispose();
    this.snap.dispose();
    this.canvas.dispose();
    this.history.clear();
    this.layers.clear();
  }
}