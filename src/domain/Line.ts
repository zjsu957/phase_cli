import { GeometryShape } from './GeometryShape.js';
import type { ShapeVisitor } from './ShapeVisitor.js';

export class Line extends GeometryShape {
  constructor(id: string, x1: number, y1: number, x2: number, y2: number) {
    super(id, { x1, y1, x2, y2 }, [['x1', 'y1'], ['x2', 'y2']]);
  }
  override get tag(): string { return 'line'; }
  override clone(): Line {
    return this.copyAppearanceTo(new Line(this.id, this.number('x1'), this.number('y1'), this.number('x2'), this.number('y2')));
  }
  override accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitLine(this); }
}
