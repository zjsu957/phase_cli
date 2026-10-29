import { EditorError } from '../domain/EditorError.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import type { EditCommand } from './commands/EditCommand.js';

export class CommandHistory {
  private readonly undoStack: EditCommand[] = [];
  private readonly redoStack: EditCommand[] = [];
  private blockedByDocumentCommand = true;

  execute(command: EditCommand, document: SvgDocument): string {
    const result = command.execute(document);
    this.undoStack.push(command);
    this.redoStack.length = 0;
    this.blockedByDocumentCommand = false;
    return result;
  }
  barrier(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.blockedByDocumentCommand = true;
  }
  private checkBarrier(): void {
    if (this.blockedByDocumentCommand) throw new EditorError('undo not allowed after io command');
  }
  undo(document: SvgDocument): string {
    this.checkBarrier();
    const command = this.undoStack.at(-1);
    if (!command) throw new EditorError('nothing to undo');
    const result = command.undo(document);
    this.undoStack.pop();
    this.redoStack.push(command);
    return result;
  }
  redo(document: SvgDocument): string {
    this.checkBarrier();
    const command = this.redoStack.at(-1);
    if (!command) throw new EditorError('nothing to redo');
    const result = command.redo(document);
    this.redoStack.pop();
    this.undoStack.push(command);
    return result;
  }
}
