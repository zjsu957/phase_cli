import type { Circle } from '../domain/Circle.js';
import type { Ellipse } from '../domain/Ellipse.js';
import type { Group } from '../domain/Group.js';
import type { Line } from '../domain/Line.js';
import type { Rect } from '../domain/Rect.js';
import type { Shape } from '../domain/Shape.js';
import type { ShapeVisitor } from '../domain/ShapeVisitor.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import type { Text } from '../domain/Text.js';

export class DocumentPresenter implements ShapeVisitor<string> {
  tree(document: SvgDocument, id?: string): string {
    if (id !== undefined) {
      const shape = document.find(id);
      return [this.describe(shape), ...this.branches(shape.children, '')].join('\n');
    }
    return ['svg (' + document.width + 'x' + document.height + ')', ...this.branches(document.children, '')].join('\n');
  }
  show(document: SvgDocument, id: string): string {
    const shape = document.find(id);
    const parent = document.parentOf(id)?.label ?? 'svg';
    return [shape.label + '  parent=' + parent, ...[...shape.attributes].map(([key, value]) =>
      '  ' + key + '=' + (key === 'text' ? JSON.stringify(value) : value),
    )].join('\n');
  }
  private branches(children: readonly Shape[], prefix: string): string[] {
    return children.flatMap((shape, index) => {
      const last = index === children.length - 1;
      return [prefix + (last ? '└── ' : '├── ') + this.describe(shape),
        ...this.branches(shape.children, prefix + (last ? '    ' : '│   '))];
    });
  }
  private describe(shape: Shape): string {
    const detail = shape.accept(this);
    const styles = [...shape.styles].map(([key, value]) => key + '=' + value).join(' ');
    return [shape.label, detail, styles].filter(Boolean).join('  ');
  }
  private attrs(shape: Shape, names: readonly string[]): string {
    return names.map(name => name + '=' + shape.attributes.get(name)).join(' ');
  }
  visitRect(shape: Rect): string {
    const a = shape.attributes;
    return 'x=' + a.get('x') + ' y=' + a.get('y') + ' w=' + a.get('width') + ' h=' + a.get('height');
  }
  visitCircle(shape: Circle): string { return this.attrs(shape, ['cx', 'cy', 'r']); }
  visitEllipse(shape: Ellipse): string { return this.attrs(shape, ['cx', 'cy', 'rx', 'ry']); }
  visitLine(shape: Line): string {
    const a = shape.attributes;
    return '(' + a.get('x1') + ',' + a.get('y1') + ') -> (' + a.get('x2') + ',' + a.get('y2') + ')';
  }
  visitText(shape: Text): string {
    const a = shape.attributes;
    return '(' + a.get('x') + ',' + a.get('y') + ') ' + JSON.stringify(a.get('text'));
  }
  visitGroup(_shape: Group): string { return ''; }
}
