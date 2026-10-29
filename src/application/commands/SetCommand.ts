import type { SvgDocument } from '../../domain/SvgDocument.js';
import { SnapshotCommand } from './SnapshotCommand.js';

export class SetCommand extends SnapshotCommand {
  constructor(private readonly id: string, private readonly attr: string, private readonly value: string) { super(); }
  protected override apply(document: SvgDocument): string {
    const shape = document.find(this.id);
    shape.set(this.attr, this.value);
    return shape.label + ' updated: ' + this.attr + '=' + JSON.stringify(shape.attributes.get(this.attr));
  }
}
