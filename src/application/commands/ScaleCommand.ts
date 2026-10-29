import type { SvgDocument } from '../../domain/SvgDocument.js';
import { SnapshotCommand } from './SnapshotCommand.js';

export class ScaleCommand extends SnapshotCommand {
  constructor(private readonly id: string, private readonly factor: number) { super(); }
  protected override apply(document: SvgDocument): string {
    const shape = document.find(this.id);
    shape.scale(this.factor);
    return shape.label + ' scaled by ' + this.factor;
  }
}
