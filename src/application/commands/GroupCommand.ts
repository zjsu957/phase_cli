import type { SvgDocument } from '../../domain/SvgDocument.js';
import { SnapshotCommand } from './SnapshotCommand.js';

export class GroupCommand extends SnapshotCommand {
  private readonly ids: readonly string[];
  constructor(private readonly id: string, ids: readonly string[]) {
    super();
    this.ids = [...ids];
  }
  protected override apply(document: SvgDocument): string {
    return document.group(this.id, this.ids).label + ' created with ' + this.ids.length + ' children';
  }
}
