import { EditorError } from './EditorError.js';
import { NumericValue } from './NumericValue.js';
import { Shape } from './Shape.js';
import type { ShapeVisitor } from './ShapeVisitor.js';

export class Group extends Shape {
  private readonly members: Shape[] = [];

  constructor(id: string) { super(id); }
  override get tag(): string { return 'g'; }
  override get children(): readonly Shape[] { return [...this.members]; }
  override asContainer(): Group { return this; }
  override findParent(id: string): Group | undefined {
    if (this.members.some(child => child.id === id)) return this;
    for (const child of this.members) {
      const parent = child.findParent(id);
      if (parent) return parent;
    }
    return undefined;
  }

  insert(shape: Shape, index = this.members.length): void {
    if (!Number.isInteger(index) || index < 0 || index > this.members.length) throw new EditorError('invalid child position');
    if (shape.find(this.id) === this) throw new EditorError('cannot move a container into its own descendant: ' + shape.id);
    const ids = new Set(this.collectIds(this));
    for (const id of this.collectIds(shape)) {
      if (ids.has(id)) throw new EditorError('id already exists: ' + id);
    }
    this.members.splice(index, 0, shape);
  }
  remove(shape: Shape): number {
    const index = this.members.indexOf(shape);
    if (index < 0) throw new EditorError('no such child: ' + shape.id);
    this.members.splice(index, 1);
    return index;
  }
  private collectIds(shape: Shape): string[] {
    return [shape.id, ...shape.children.flatMap(child => this.collectIds(child))];
  }
  override find(id: string): Shape | undefined {
    if (this.id === id) return this;
    for (const child of this.members) {
      const match = child.find(id);
      if (match) return match;
    }
    return undefined;
  }
  override move(dx: number, dy: number): void {
    NumericValue.finite(dx, 'dx');
    NumericValue.finite(dy, 'dy');
    for (const child of this.members) child.move(dx, dy);
  }
  override scale(factor: number): void {
    NumericValue.positive(factor, 'scale factor');
    for (const child of this.members) child.scale(factor);
  }
  override clone(): Group {
    const result = this.copyAppearanceTo(new Group(this.id));
    for (const child of this.members) result.insert(child.clone());
    return result;
  }
  override accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitGroup(this); }
}
