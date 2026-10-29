import { DOMImplementation, XMLSerializer, type Element } from '@xmldom/xmldom';
import type { Circle } from '../../domain/Circle.js';
import { EditorError } from '../../domain/EditorError.js';
import type { Ellipse } from '../../domain/Ellipse.js';
import type { Group } from '../../domain/Group.js';
import type { Line } from '../../domain/Line.js';
import type { Rect } from '../../domain/Rect.js';
import type { Shape } from '../../domain/Shape.js';
import type { ShapeVisitor } from '../../domain/ShapeVisitor.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { Text } from '../../domain/Text.js';

export class SvgSerializer implements ShapeVisitor<Element> {
  private readonly namespace = 'http://www.w3.org/2000/svg';
  private readonly xml = new DOMImplementation().createDocument(this.namespace, 'svg', null);

  serialize(document: SvgDocument): string {
    const root = this.xml.documentElement!;
    while (root.firstChild) root.removeChild(root.firstChild);
    for (const attribute of Array.from(root.attributes)) root.removeAttribute(attribute.name);
    root.setAttribute('xmlns', this.namespace);
    root.setAttribute('width', String(document.width));
    root.setAttribute('height', String(document.height));
    root.setAttribute('viewBox', document.viewBox);
    if (document.rootId !== undefined) this.attribute(root, 'id', document.rootId);
    for (const [name, value] of document.rootAttributes) this.attribute(root, name, value);
    for (const shape of document.children) root.appendChild(shape.accept(this));
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(this.xml) + '\n';
  }
  private validate(value: string): void {
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF\p{Surrogate}]/u.test(value)) {
      throw new EditorError('invalid XML character in document');
    }
  }
  private attribute(element: Element, name: string, value: string): void {
    this.validate(value);
    element.setAttribute(name, value);
  }
  private element(shape: Shape): Element {
    const result = this.xml.createElementNS(this.namespace, shape.tag);
    this.attribute(result, 'id', shape.id);
    for (const [name, value] of shape.attributes) {
      if (name === 'text') {
        this.validate(value);
        result.appendChild(this.xml.createTextNode(value));
      } else this.attribute(result, name, value);
    }
    for (const child of shape.children) result.appendChild(child.accept(this));
    return result;
  }
  visitRect(shape: Rect): Element { return this.element(shape); }
  visitCircle(shape: Circle): Element { return this.element(shape); }
  visitEllipse(shape: Ellipse): Element { return this.element(shape); }
  visitLine(shape: Line): Element { return this.element(shape); }
  visitText(shape: Text): Element { return this.element(shape); }
  visitGroup(shape: Group): Element { return this.element(shape); }
}
