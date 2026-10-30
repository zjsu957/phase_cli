import { beforeEach, describe, expect, it } from 'vitest';
import { CommandRouter } from '../src/cli/CommandRouter.js';
import { SvgParser } from '../src/infrastructure/svg/SvgParser.js';

describe('decimal geometry and XML-safe input', () => {
  let cli: CommandRouter;
  beforeEach(() => {
    cli = new CommandRouter();
    cli.execute('init');
    cli.execute('create rect r 1 2 3 4');
    cli.execute('create text t 0 0 "original"');
    cli.execute('move r 10 0');
    cli.execute('undo');
  });

  it.each([
    'create rect hex 0x10 0 1 1',
    'move r 0b10 0',
    'scale r 0o10',
    'set r width 0x20',
    'canvas 0x100 600',
    'init 0b100 600',
  ])('rejects non-SVG number syntax and keeps document plus redo: %s', command => {
    const original = cli.execute('tree');
    expect(cli.execute(command)).toMatch(/^error: .*must be a finite number$/u);
    expect(cli.execute('tree')).toBe(original);
    expect(cli.execute('redo')).not.toMatch(/^error:/u);
    expect(cli.execute('tree r')).toContain('x=11');
  });

  it.each(['0x10', '0b10', '0o10', '1_000', '1e', '1,5', ''])(
    'rejects invalid SVG geometry before import: %s', value => {
      expect(() => new SvgParser().parse('<svg><rect id="r" x="' + value + '"/></svg>'))
        .toThrow('must be a finite number');
    },
  );

  it.each([
    'create text bad 0 0 "bad\u0000text"',
    'set t text "bad\u0000text"',
    'set r fill "bad\u0001color"',
    'create g "bad\u0002id"',
    'create text surrogate 0 0 "\ud800"',
  ])('rejects XML-invalid values before editing: %s', command => {
    const original = cli.execute('tree');
    expect(cli.execute(command)).toBe('error: invalid XML character in document');
    expect(cli.execute('tree')).toBe(original);
    expect(cli.execute('redo')).not.toMatch(/^error:/u);
  });

  it.each([
    '<svg><text id="t">bad&#0;text</text></svg>',
    '<svg><g id="bad&#1;id"/></svg>',
    '<svg id="root&#1;"/>',
    '<svg fill="bad&#1;color"/>',
    '<svg><rect id="r" fill="bad&#1;color"/></svg>',
    '<svg><text id="t">bad\u0000text</text></svg>',
  ])(
    'rejects invalid decoded XML values during import: %s', source => {
      expect(() => new SvgParser().parse(source)).toThrow('invalid XML character');
    },
  );

  it('allows SVG decimal/exponent numbers, emoji, escaped quotes and literal in content', () => {
    expect(cli.execute('create text decimal +.5 -2.5e1 "😀 says \\"in\\""')).toBe('text#decimal created');
    expect(cli.execute('tree decimal')).toContain('(0.5,-25) "😀 says \\"in\\""');
    expect(cli.execute('set r width 1.e2')).not.toMatch(/^error:/u);
    expect(cli.execute('show r')).toContain('width=100');
    const doc = new SvgParser().parse('<svg width="4e2px" height="+200"><rect id="decimal" x="-.5px"/></svg>').document;
    expect(doc.width).toBe(400);
    expect(doc.find('decimal').attributes.get('x')).toBe('-0.5');
  });
});
