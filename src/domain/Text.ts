import { GeometryShape } from './GeometryShape.js';
import type { ShapeVisitor } from './ShapeVisitor.js';

export class Text extends GeometryShape {
  private content: string;

  constructor(id: string, x: number, y: number, content: string) {
    super(id, { x, y }, [['x', 'y']]);
    this.content = content;
  }
  override get tag(): string { return 'text'; }
  override get attributes(): ReadonlyMap<string, string> {
    return new Map([...super.attributes, ['text', this.content]]);
  }
  protected override setOwnAttribute(attr: string, value: string): boolean {
    if (attr !== 'text') return super.setOwnAttribute(attr, value);
    this.content = value;
    return true;
  }
  override clone(): Text {
    return this.copyAppearanceTo(new Text(this.id, this.number('x'), this.number('y'), this.content));
  }
  override accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitText(this); }
}
