import { Circle } from './Circle.js';
import { EditorError } from './EditorError.js';
import { Ellipse } from './Ellipse.js';
import { Group } from './Group.js';
import { Line } from './Line.js';
import { NumericValue } from './NumericValue.js';
import { Rect } from './Rect.js';
import type { Shape } from './Shape.js';
import { Text } from './Text.js';

export class ShapeFactory {
  // Phase 1's single type-name dispatch point; replace with providers in the plugin phase.
  private readonly creators = new Map<string, (id: string, params: readonly string[]) => Shape>([
    ['rect', (id, p) => {
      this.count(p, 4, 5, 'rect <id> <x> <y> <w> <h> [fill]');
      return this.paint(new Rect(id, this.n(p, 0), this.n(p, 1), this.n(p, 2), this.n(p, 3)), 'fill', p[4]);
    }],
    ['circle', (id, p) => {
      this.count(p, 3, 4, 'circle <id> <cx> <cy> <r> [fill]');
      return this.paint(new Circle(id, this.n(p, 0), this.n(p, 1), this.n(p, 2)), 'fill', p[3]);
    }],
    ['ellipse', (id, p) => {
      this.count(p, 4, 5, 'ellipse <id> <cx> <cy> <rx> <ry> [fill]');
      return this.paint(new Ellipse(id, this.n(p, 0), this.n(p, 1), this.n(p, 2), this.n(p, 3)), 'fill', p[4]);
    }],
    ['line', (id, p) => {
      this.count(p, 4, 5, 'line <id> <x1> <y1> <x2> <y2> [stroke]');
      return this.paint(new Line(id, this.n(p, 0), this.n(p, 1), this.n(p, 2), this.n(p, 3)), 'stroke', p[4]);
    }],
    ['text', (id, p) => {
      this.count(p, 3, 3, 'text <id> <x> <y> "content"');
      return new Text(id, this.n(p, 0), this.n(p, 1), p[2]!);
    }],
    ['g', (id, p) => {
      this.count(p, 0, 0, 'g <id>');
      return new Group(id);
    }],
  ]);

  create(type: string, id: string, params: readonly string[]): Shape {
    const creator = this.creators.get(type);
    if (!creator) throw new EditorError('unknown shape type: ' + type + ' (is the plugin loaded?)');
    return creator(id, params);
  }
  private n(params: readonly string[], index: number): number {
    return NumericValue.parse(params[index]!, 'geometry parameter ' + (index + 1));
  }
  private count(params: readonly string[], min: number, max: number, usage: string): void {
    if (params.length < min || params.length > max) throw new EditorError('usage: create ' + usage + ' [in <containerId>]');
  }
  private paint(shape: Shape, attr: string, value: string | undefined): Shape {
    if (value !== undefined) shape.set(attr, value);
    return shape;
  }
}
