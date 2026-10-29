import { ShapeFactory } from '../../domain/ShapeFactory.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { SnapshotCommand } from './SnapshotCommand.js';

export class CreateCommand extends SnapshotCommand {
  private readonly params: readonly string[];
  constructor(private readonly type: string, private readonly id: string, params: readonly string[], private readonly parentId?: string) {
    super();
    this.params = [...params];
  }
  protected override apply(document: SvgDocument): string {
    const shape = new ShapeFactory().create(this.type, this.id, this.params);
    document.add(shape, this.parentId);
    return shape.label + ' created' + (this.parentId === undefined ? '' : ' in g#' + this.parentId);
  }
}
