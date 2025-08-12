import { IAutoSaveService } from '@/types/services';
import { EDITOR_CONSTANTS } from '../constants';

export class AutoSaveService implements IAutoSaveService {
  private enabled: boolean = true;
  private saveTimeoutId: NodeJS.Timeout | null = null;

  save(data: unknown): void {
    if (!this.enabled) return;

    // Clear existing timeout
    if (this.saveTimeoutId) {
      clearTimeout(this.saveTimeoutId);
    }

    // Debounce the save operation
    this.saveTimeoutId = setTimeout(() => {
      try {
        localStorage.setItem(
          EDITOR_CONSTANTS.AUTOSAVE.STORAGE_KEY,
          JSON.stringify(data)
        );
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }
    }, EDITOR_CONSTANTS.AUTOSAVE.DEBOUNCE_MS);
  }

  load<T>(): T | null {
    try {
      const savedData = localStorage.getItem(EDITOR_CONSTANTS.AUTOSAVE.STORAGE_KEY);
      if (!savedData) return null;
      
      return JSON.parse(savedData) as T;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  }

  clear(): void {
    if (this.saveTimeoutId) {
      clearTimeout(this.saveTimeoutId);
      this.saveTimeoutId = null;
    }
    
    try {
      localStorage.removeItem(EDITOR_CONSTANTS.AUTOSAVE.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (!enabled && this.saveTimeoutId) {
      clearTimeout(this.saveTimeoutId);
      this.saveTimeoutId = null;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  dispose(): void {
    if (this.saveTimeoutId) {
      clearTimeout(this.saveTimeoutId);
      this.saveTimeoutId = null;
    }
  }
}