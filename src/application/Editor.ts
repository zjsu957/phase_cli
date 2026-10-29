import { EditorError } from '../domain/EditorError.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { CommandHistory } from './CommandHistory.js';
import { DocumentPresenter } from './DocumentPresenter.js';
import type { EditCommand } from './commands/EditCommand.js';
import type { DocumentStore } from './ports/DocumentStore.js';

export class Editor {
  private document: SvgDocument | undefined;
  private readonly history = new CommandHistory();
  private readonly presenter = new DocumentPresenter();
  private currentPath: string | undefined;

  constructor(private readonly store?: DocumentStore) {}

  init(width = 800, height = 600): string {
    const next = new SvgDocument(width, height);
    this.document = next;
    this.currentPath = undefined;
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
  read(path: string): string {
    const loaded = this.documentStore().read(path);
    const next = loaded.document;
    const result = [...loaded.warnings, 'read ' + path + ' (' + next.elementCount + ' elements)'].join('\n');
    this.document = next;
    this.currentPath = path;
    this.history.barrier();
    return result;
  }
  save(path?: string): string {
    const document = this.requireDocument();
    const destination = path ?? this.currentPath;
    if (!destination) throw new EditorError("no file path. use 'save <file.svg>' first");
    this.documentStore().save(destination, document);
    this.currentPath = destination;
    this.history.barrier();
    return 'saved to ' + destination + ' (' + document.elementCount + ' elements)';
  }
  private documentStore(): DocumentStore {
    if (!this.store) throw new EditorError('document storage is not configured');
    return this.store;
  }
}
