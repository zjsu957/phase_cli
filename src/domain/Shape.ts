import { EditorError } from './EditorError.js';
import { NumericValue } from './NumericValue.js';
import { SvgPresentation } from './SvgPresentation.js';
import type { ShapeVisitor } from './ShapeVisitor.js';
import type { Group } from './Group.js';

export abstract class Shape {
  private readonly shapeId: string;
  private readonly appearance = new SvgPresentation();

  protected constructor(id: string) {
    if (!id || /\s/u.test(id)) throw new EditorError('id must be non-empty and contain no whitespace');
    this.shapeId = id;
  }
  get id(): string { return this.shapeId; }
  abstract get tag(): string;
  get label(): string { return this.tag + '#' + this.id; }
  get children(): readonly Shape[] { return []; }
  get styles(): ReadonlyMap<string, string> { return this.appearance.attributes; }
  get attributes(): ReadonlyMap<string, string> { return this.appearance.attributes; }

  find(id: string): Shape | undefined { return this.id === id ? this : undefined; }
  findParent(_id: string): Group | undefined { return undefined; }
  asContainer(): Group { throw new EditorError('not a container: ' + this.id); }

  set(attr: string, value: string): void {
    if (attr === 'fill' || attr === 'stroke') {
      if (!value.trim()) throw new EditorError(attr + ' must not be empty');
      this.appearance.set(attr, value);
    } else if (attr === 'stroke-width') {
      this.appearance.set(attr, String(NumericValue.nonnegative(NumericValue.parse(value, attr), attr)));
    } else if (!this.setOwnAttribute(attr, value)) {
      throw new EditorError('unknown attribute: ' + attr);
    }
  }
  protected setOwnAttribute(_attr: string, _value: string): boolean { return false; }
  importPresentation(attr: string, value: string): void { this.appearance.set(attr, value); }
  protected copyAppearanceTo<T extends Shape>(target: T): T {
    for (const [name, value] of this.appearance.attributes) target.importPresentation(name, value);
    return target;
  }
  abstract move(dx: number, dy: number): void;
  abstract scale(factor: number): void;
  abstract clone(): Shape;
  abstract accept<T>(visitor: ShapeVisitor<T>): T;
}
