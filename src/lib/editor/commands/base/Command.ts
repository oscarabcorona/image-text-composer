import { EditorCommand } from '@/types/editor';
import { IServiceProvider } from '@/types/services';

/**
 * Base command class implementing Dependency Injection
 * Following Dependency Inversion Principle - commands depend on abstractions, not concrete implementations
 */
export abstract class BaseCommand implements EditorCommand {
  constructor(protected services: IServiceProvider) {}

  abstract execute(): void;
  abstract undo(): void;
  abstract get description(): string;
}