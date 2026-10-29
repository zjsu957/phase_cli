import { GeometryShape } from './GeometryShape.js';
import type { ShapeVisitor } from './ShapeVisitor.js';

export class Ellipse extends GeometryShape {
  constructor(id: string, cx: number, cy: number, rx: number, ry: number) {
    super(id, { cx, cy, rx, ry }, [['cx', 'cy']], ['rx', 'ry']);
  }
  override get tag(): string { return 'ellipse'; }
  override clone(): Ellipse {
    return this.copyAppearanceTo(new Ellipse(this.id, this.number('cx'), this.number('cy'), this.number('rx'), this.number('ry')));
  }
  override accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitEllipse(this); }
}
