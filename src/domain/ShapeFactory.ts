import { Circle } from './Circle.js';
import { EditorError } from './EditorError.js';
import { Ellipse } from './Ellipse.js';
import { Group } from './Group.js';
import { Line } from './Line.js';
import { Rect } from './Rect.js';
import type { Shape } from './Shape.js';
import { ShapeDefinition } from './ShapeDefinition.js';
import { Text } from './Text.js';

export class ShapeFactory {
  // The only shape-name dispatch, shared by CLI creation and SVG import.
  // Replace the built-in definitions with ShapeProvider registration in the plugin phase.
  private readonly definitions = new Map<string, ShapeDefinition>([
    ['rect', new ShapeDefinition(['x', 'y', 'width', 'height'],
      (id, n) => new Rect(id, n[0]!, n[1]!, n[2]!, n[3]!), 'fill')],
    ['circle', new ShapeDefinition(['cx', 'cy', 'r'],
      (id, n) => new Circle(id, n[0]!, n[1]!, n[2]!), 'fill')],
    ['ellipse', new ShapeDefinition(['cx', 'cy', 'rx', 'ry'],
      (id, n) => new Ellipse(id, n[0]!, n[1]!, n[2]!, n[3]!), 'fill')],
    ['line', new ShapeDefinition(['x1', 'y1', 'x2', 'y2'],
      (id, n) => new Line(id, n[0]!, n[1]!, n[2]!, n[3]!), 'stroke')],
    ['text', new ShapeDefinition(['x', 'y'],
      (id, n, content) => new Text(id, n[0]!, n[1]!, content), undefined, true)],
    ['g', new ShapeDefinition([], id => new Group(id))],
  ]);

  private definition(type: string): ShapeDefinition {
    const definition = this.definitions.get(type);
    if (!definition) throw new EditorError('unknown shape type: ' + type + ' (is the plugin loaded?)');
    return definition;
  }
  create(type: string, id: string, params: readonly string[]): Shape {
    return this.definition(type).create(type, id, params);
  }
  get creationSyntax(): readonly string[] {
    return [...this.definitions].map(([type, definition]) => definition.syntax(type));
  }
  fromSvg(type: string, id: string, attributes: ReadonlyMap<string, string>, text: string): Shape {
    return this.definition(type).fromSvg(id, attributes, text);
  }
}
