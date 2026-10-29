import { EditorError } from '../domain/EditorError.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { CommandHistory } from './CommandHistory.js';
import { DocumentPresenter } from './DocumentPresenter.js';
import type { EditCommand } from './commands/EditCommand.js';

export class Editor {
  private document: SvgDocument | undefined;
  private readonly history = new CommandHistory();
  private readonly presenter = new DocumentPresenter();

  init(width = 800, height = 600): string {
    const next = new SvgDocument(width, height);
    this.document = next;
    this.history.barrier();
    return 'canvas ' + width + 'x' + height + ' created';
  }
  requireDocument(): SvgDocument {
    if (!this.document) throw new EditorError("no document. use 'init' or 'read' first");
    return this.document;
  }
  edit(command: EditCommand): string { return this.history.execute(command, this.requireDocument()); }
  undo(): string { return this.history.undo(this.requireDocument()); }
  redo(): string { return this.history.redo(this.requireDocument()); }
  tree(id?: string): string { return this.presenter.tree(this.requireDocument(), id); }
  show(id: string): string { return this.presenter.show(this.requireDocument(), id); }
  canvas(width?: number, height?: number): string {
    const document = this.requireDocument();
    if (width !== undefined && height !== undefined) {
      document.resize(width, height);
      this.history.barrier();
      return 'canvas resized to ' + document.width + 'x' + document.height;
    }
    return 'canvas ' + document.width + 'x' + document.height;
  }
  pendingFileCommand(needsDocument = true): never {
    if (needsDocument) this.requireDocument();
    throw new EditorError('SVG file I/O is not implemented in this milestone');
  }
}
