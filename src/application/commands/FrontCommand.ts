import type { SvgDocument } from '../../domain/SvgDocument.js';
import { SnapshotCommand } from './SnapshotCommand.js';

export class FrontCommand extends SnapshotCommand {
  constructor(private readonly id: string) { super(); }
  protected override apply(document: SvgDocument): string {
    document.front(this.id);
    return document.find(this.id).label + ' moved to front';
  }
}
