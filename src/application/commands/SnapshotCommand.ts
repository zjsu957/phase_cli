import { EditorError } from '../../domain/EditorError.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { EditCommand } from './EditCommand.js';

export abstract class SnapshotCommand implements EditCommand {
  private before: SvgDocument | undefined;
  private after: SvgDocument | undefined;
  private summary = '';

  execute(document: SvgDocument): string {
    if (this.after) throw new EditorError('command has already been executed');
    const working = document.clone();
    const summary = this.apply(working);
    // Commit only after validation and mutation of the isolated working copy succeed.
    this.before = document.clone();
    this.after = working.clone();
    document.restore(working);
    this.summary = summary;
    return summary;
  }
  undo(document: SvgDocument): string {
    if (!this.before) throw new EditorError('command has not been executed');
    document.restore(this.before);
    return 'undone: ' + this.summary;
  }
  redo(document: SvgDocument): string {
    if (!this.after) throw new EditorError('command has not been executed');
    document.restore(this.after);
    return 'redone: ' + this.summary;
  }
  protected abstract apply(document: SvgDocument): string;
}
