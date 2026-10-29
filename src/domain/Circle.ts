import { GeometryShape } from './GeometryShape.js';
import type { ShapeVisitor } from './ShapeVisitor.js';

export class Circle extends GeometryShape {
  constructor(id: string, cx: number, cy: number, r: number) {
    super(id, { cx, cy, r }, [['cx', 'cy']], ['r']);
  }
  override get tag(): string { return 'circle'; }
  override clone(): Circle {
    return this.copyAppearanceTo(new Circle(this.id, this.number('cx'), this.number('cy'), this.number('r')));
  }
  override accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitCircle(this); }
}
