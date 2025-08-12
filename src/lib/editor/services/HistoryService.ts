import { IHistoryService } from '@/types/services';
import { EditorCommand } from '@/types/editor';
import { EDITOR_CONSTANTS } from '../constants';

export class HistoryService implements IHistoryService {
  private history: EditorCommand[] = [];
  private currentIndex: number = -1;

  execute(command: EditorCommand): void {
    // Remove any commands after the current index
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    // Add the new command
    this.history.push(command);
    
    // Limit history size
    if (this.history.length > EDITOR_CONSTANTS.HISTORY.MAX_STEPS) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
    
    // Execute the command
    command.execute();
  }

  undo(): void {
    if (!this.canUndo()) return;
    
    const command = this.history[this.currentIndex];
    command.undo();
    this.currentIndex--;
  }

  redo(): void {
    if (!this.canRedo()) return;
    
    this.currentIndex++;
    const command = this.history[this.currentIndex];
    command.execute();
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  getHistory(): EditorCommand[] {
    return [...this.history];
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }
}