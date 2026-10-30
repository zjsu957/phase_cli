import { DOMParser, onWarningStopParsing, type Element, type Node } from '@xmldom/xmldom';
import { LoadedDocument } from '../../application/LoadedDocument.js';
import { EditorError } from '../../domain/EditorError.js';
import { NumericValue } from '../../domain/NumericValue.js';
import type { Shape } from '../../domain/Shape.js';
import { ShapeFactory } from '../../domain/ShapeFactory.js';
import { SvgDocument } from '../../domain/SvgDocument.js';
import { XmlValue } from '../../domain/XmlValue.js';

export class SvgParser {
  private readonly factory = new ShapeFactory();
  private readonly svgNamespace = 'http://www.w3.org/2000/svg';

  parse(source: string): LoadedDocument {
    XmlValue.validate(source);
    let xml;
    try {
      xml = new DOMParser({ onError: onWarningStopParsing }).parseFromString(source, 'image/svg+xml');
    } catch {
      throw new EditorError('invalid SVG: malformed XML');
    }
    if (xml.doctype) throw new EditorError('invalid SVG: DOCTYPE is not supported');
    const root = xml.documentElement;
    if (!root || root.localName !== 'svg') throw new EditorError('invalid SVG: root element must be <svg>');
    this.checkNamespace(root);
    const elements = this.descendants(root);
    const usedIds = new Set<string>();
    const rootId = root.getAttribute('id');
    if (rootId !== null) usedIds.add(rootId);
    for (const element of elements) {
      if (!element.hasAttribute('id')) continue;
      const id = element.getAttribute('id')!;
      if (usedIds.has(id)) throw new EditorError('id already exists: ' + id);
      usedIds.add(id);
    }
    const counters = new Map<string, number>();
    const warnings: string[] = [];
    const viewBox = root.getAttribute('viewBox') ?? undefined;
    const viewBoxParts = viewBox?.trim().split(/[\s,]+/u);
    const width = this.length(root.getAttribute('width') ?? viewBoxParts?.[2] ?? '800', 'canvas width');
    const height = this.length(root.getAttribute('height') ?? viewBoxParts?.[3] ?? '600', 'canvas height');
    const document = new SvgDocument(width, height);
    if (rootId !== null) document.setRootId(rootId);
    if (viewBox !== undefined) document.setViewBox(viewBox);
    for (const [name, value] of this.attributes(root)) {
      if (!['id', 'width', 'height', 'viewBox', 'version'].includes(name)) document.importPresentation(name, value);
    }
    if (this.directText(root).trim()) throw new EditorError('invalid SVG: unexpected text in <svg>');
    for (const child of this.childElements(root)) document.add(this.readShape(child, usedIds, counters, warnings));
    return new LoadedDocument(document, warnings);
  }
  private readShape(
    element: Element, used: Set<string>, counters: Map<string, number>, warnings: string[],
  ): Shape {
    this.checkNamespace(element);
    const type = element.localName ?? element.tagName;
    let id = element.getAttribute('id');
    if (id === null) {
      let counter = counters.get(type) ?? 0;
      do { id = type + ++counter; } while (used.has(id));
      counters.set(type, counter);
      used.add(id);
      warnings.push('warning: assigned id ' + id + ' to unnamed <' + type + '>');
    }
    const shape = this.factory.fromSvg(type, id, this.attributes(element), this.directText(element));
    for (const child of this.childElements(element)) {
      shape.asContainer().insert(this.readShape(child, used, counters, warnings));
    }
    return shape;
  }
  private attributes(element: Element): ReadonlyMap<string, string> {
    const result = new Map<string, string>();
    for (let index = 0; index < element.attributes.length; index++) {
      const attribute = element.attributes.item(index)!;
      if (attribute.namespaceURI !== 'http://www.w3.org/2000/xmlns/') result.set(attribute.name, attribute.value);
    }
    return result;
  }
  private childElements(node: Node): Element[] {
    const result: Element[] = [];
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === child.ELEMENT_NODE) result.push(child as Element);
      else if (child.nodeType !== child.TEXT_NODE && child.nodeType !== child.CDATA_SECTION_NODE &&
        child.nodeType !== child.COMMENT_NODE) {
        throw new EditorError('invalid SVG: unsupported XML node');
      }
    }
    return result;
  }
  private descendants(element: Element): Element[] {
    return this.childElements(element).flatMap(child => [child, ...this.descendants(child)]);
  }
  private directText(node: Node): string {
    let text = '';
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === child.TEXT_NODE || child.nodeType === child.CDATA_SECTION_NODE) text += child.nodeValue;
    }
    return text;
  }
  private checkNamespace(element: Element): void {
    if (element.namespaceURI !== this.svgNamespace) {
      throw new EditorError('invalid SVG namespace: ' + element.namespaceURI);
    }
  }
  private length(value: string, name: string): number {
    return NumericValue.parse(value.replace(/px$/u, ''), name);
  }
}
