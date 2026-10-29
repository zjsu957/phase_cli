import { GeometryShape } from './GeometryShape.js';
import type { ShapeVisitor } from './ShapeVisitor.js';

export class Rect extends GeometryShape {
  constructor(id: string, x: number, y: number, width: number, height: number) {
    super(id, { x, y, width, height }, [['x', 'y']], ['width', 'height']);
  }
  override get tag(): string { return 'rect'; }
  override clone(): Rect {
    return this.copyAppearanceTo(new Rect(this.id, this.number('x'), this.number('y'), this.number('width'), this.number('height')));
  }
  override accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitRect(this); }
}
