import { describe, expect, it } from 'vitest';
import { DocumentPresenter } from '../src/application/DocumentPresenter.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { SvgParser } from '../src/infrastructure/svg/SvgParser.js';
import { SvgSerializer } from '../src/infrastructure/svg/SvgSerializer.js';

describe('SVG XML codec', () => {
  const parser = new SvgParser();
  const presenter = new DocumentPresenter();

  it('round-trips all six types, hierarchy, styles, text and z-order', () => {
    const source = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">' +
      '<g id="g1" fill="blue"><rect id="r1" x="-1.5" y="2" width="30" height="40" fill="#fff"/>' +
      '<circle id="c1" cx="10" cy="20" r="5"/><ellipse id="e1" cx="1" cy="2" rx="3" ry="4"/>' +
      '<line id="l1" x1="1" y1="2" x2="3" y2="4" stroke="black" stroke-width="2"/>' +
      '<text id="t1" x="5" y="6" font-size="16" text-anchor="middle">开始 &amp; &lt;结束&gt; "😀"</text></g></svg>';
    const original = parser.parse(source).document;
    const serialized = new SvgSerializer().serialize(original);
    const loaded = parser.parse(serialized);
    expect(loaded.warnings).toEqual([]);
    expect(presenter.tree(loaded.document)).toBe(presenter.tree(original));
    expect(loaded.document.elementCount).toBe(6);
    expect(serialized).toContain('encoding="UTF-8"');
    expect(serialized).toContain('开始 &amp; &lt;结束&gt;');
    expect(serialized).not.toContain(' text=');
    expect(loaded.document.find('t1').attributes.get('text')).toBe('开始 & <结束> "😀"');
  });

  it('reserves ids throughout the document before naming unnamed shapes', () => {
    const loaded = parser.parse('<svg><rect/><g><rect id="rect1"/><rect/><g id="g1"/></g></svg>');
    expect(loaded.warnings).toEqual([
      'warning: assigned id rect2 to unnamed <rect>',
      'warning: assigned id g2 to unnamed <g>',
      'warning: assigned id rect3 to unnamed <rect>',
    ]);
    expect(loaded.document.elementCount).toBe(5);
    expect(loaded.document.find('g2').children.map(child => child.id)).toEqual(['rect1', 'rect3', 'g1']);
  });

  it('does not share counters, warnings or shape state between imports', () => {
    const first = parser.parse('<svg><rect/></svg>');
    const second = parser.parse('<svg><rect/></svg>');
    first.document.find('rect1').move(10, 10);
    expect(second.warnings).toEqual(['warning: assigned id rect1 to unnamed <rect>']);
    expect(second.document.find('rect1').attributes.get('x')).toBe('0');
  });

  it('preserves transforms, text presentation and data-kind while using ordinary groups', () => {
    const loaded = parser.parse('<svg width="400px" height="200px" fill="red">' +
      '<g id="box" data-kind="box" transform="translate(60,40) scale(0.8)">' +
      '<rect id="r" width="120" height="60"/><text id="t" font-size="16" text-anchor="middle">End</text></g></svg>');
    expect(loaded.document.find('box').tag).toBe('g');
    expect(() => loaded.document.find('box').set('transform', 'translate(0,0)')).toThrow('unknown attribute: transform');
    const roundTrip = parser.parse(new SvgSerializer().serialize(loaded.document)).document;
    expect(roundTrip.find('box').attributes.get('transform')).toBe('translate(60,40) scale(0.8)');
    expect(roundTrip.find('t').attributes.get('text-anchor')).toBe('middle');
    expect(roundTrip.rootAttributes.get('fill')).toBe('red');
  });

  it('preserves a custom viewBox and resets it when explicitly resizing the canvas', () => {
    const doc = parser.parse('<svg width="800" height="600" viewBox="10 20 400 300"/>').document;
    expect(doc.clone().viewBox).toBe('10 20 400 300');
    expect(new SvgSerializer().serialize(doc)).toContain('viewBox="10 20 400 300"');
    doc.resize(100, 200);
    expect(doc.viewBox).toBe('0 0 100 200');
  });

  it('uses viewBox dimensions for an omitted viewport and preserves namespaced SVG', () => {
    const doc = parser.parse('<s:svg xmlns:s="http://www.w3.org/2000/svg" viewBox="0 0 123 456"><s:rect id="r"/></s:svg>').document;
    expect(doc.width).toBe(123);
    expect(doc.height).toBe(456);
    expect(doc.find('r').attributes.get('width')).toBe('0');
  });

  it('keeps a root id reserved across imports, edits and serialization', () => {
    const doc = parser.parse('<svg id="rect1"><rect/></svg>').document;
    expect(doc.rootId).toBe('rect1');
    expect(doc.find('rect2').id).toBe('rect2');
    expect(new SvgSerializer().serialize(doc.clone())).toContain('id="rect1"');
    expect(() => parser.parse('<svg id="root"><rect id="root"/></svg>')).toThrow('id already exists: root');
  });

  it('restores root metadata without leaking attributes from the previous state', () => {
    const doc = parser.parse('<svg fill="red" viewBox="1 2 3 4"/>').document;
    doc.restore(new SvgDocument());
    expect(doc.rootAttributes.size).toBe(0);
    expect(doc.viewBox).toBe('0 0 800 600');
  });

  it('escapes attributes and preserves empty text and CDATA', () => {
    const doc = parser.parse('<svg><rect id="r" fill="a&amp;&quot;&lt;"/>' +
      '<text id="empty"/><text id="c"><![CDATA[a < b & 开始]]></text></svg>').document;
    const result = parser.parse(new SvgSerializer().serialize(doc)).document;
    expect(result.find('r').attributes.get('fill')).toBe('a&"<');
    expect(result.find('empty').attributes.get('text')).toBe('');
    expect(result.find('c').attributes.get('text')).toBe('a < b & 开始');
  });

  it('preserves character-reference carriage returns in text across repeated round trips', () => {
    let document = parser.parse('<svg><text id="t">a&#13;b&#10;c&#9;d</text></svg>').document;
    for (let iteration = 0; iteration < 3; iteration++) {
      const xml = new SvgSerializer().serialize(document);
      expect(xml).toContain('&#13;');
      document = parser.parse(xml).document;
      expect(document.find('t').attributes.get('text')).toBe('a\rb\nc\td');
    }
  });

  it('uses XML 1.0 line-ending rules and preserves NEL and Unicode line separators', () => {
    const text = 'a\u0085b\u2028c';
    const document = parser.parse('<svg><text id="t">' + text + '</text></svg>').document;
    expect(document.find('t').attributes.get('text')).toBe(text);
    expect(parser.parse(new SvgSerializer().serialize(document)).document.find('t').attributes.get('text')).toBe(text);
  });

  it.each([
    ['<svg><rect></svg>', 'malformed XML'],
    ['<svg><rect id=r/></svg>', 'malformed XML'],
    ['<svg><rect id="r"/><circle id="r"/></svg>', 'id already exists: r'],
    ['<svg><rect id=""/></svg>', 'id must be non-empty'],
    ['<svg><rect x="NaN"/></svg>', 'must be a finite number'],
    ['<svg><circle r="-1"/></svg>', 'must not be negative'],
    ['<svg width="100%"/>', 'must be a finite number'],
    ['<svg><path id="p"/></svg>', 'unknown shape type: path'],
    ['<svg><rect id="r" rx="3"/></svg>', 'unsupported SVG attribute: rx'],
    ['<svg><text id="t"><tspan>nested</tspan></text></svg>', 'not a container: t'],
    ['<svg><rect>unexpected</rect></svg>', 'unexpected text in shape'],
    ['<svg>unexpected</svg>', 'unexpected text in <svg>'],
    ['<html/>', 'root element must be <svg>'],
    ['<svg xmlns="urn:other"/>', 'invalid SVG namespace'],
    ['<svg><g xmlns="urn:other"/></svg>', 'invalid SVG namespace'],
    ['<svg><g xmlns=""/></svg>', 'invalid SVG namespace'],
    ['<svg width="800" height="600" viewBox="0 0 0 100"/>', 'viewBox width must be positive'],
    ['<svg viewBox="0 0 100"/>', 'viewBox must contain four numbers'],
    ['<svg style="fill:red"/>', 'unsupported SVG attribute: style'],
    ['<!DOCTYPE svg SYSTEM "external.dtd"><svg/>', 'DOCTYPE is not supported'],
  ])('rejects unsupported or invalid SVG instead of silently losing content: %s', (source, message) => {
    expect(() => parser.parse(source)).toThrow(message);
  });
});
