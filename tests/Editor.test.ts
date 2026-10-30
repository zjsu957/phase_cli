import { beforeEach, describe, expect, it } from 'vitest';
import { CommandRouter } from '../src/cli/CommandRouter.js';

describe('CLI editing and history', () => {
  let cli: CommandRouter;
  beforeEach(() => {
    cli = new CommandRouter();
    cli.execute('init');
  });
  it.each([
    ['rect r 10 20 30 40 red', 'r', 'x=20 y=40 w=60 h=80'],
    ['circle c 10 20 3', 'c', 'cx=20 cy=40 r=6'],
    ['ellipse e 10 20 3 4', 'e', 'cx=20 cy=40 rx=6 ry=8'],
    ['line l 1 2 3 4 black', 'l', '(2,4) -> (6,8)'],
    ['text t 10 20 "开始"', 't', '(20,40) "开始"'],
  ])('scales positions and dimensions for %s', (creation, id, expected) => {
    expect(cli.execute('create ' + creation)).not.toMatch(/^error:/u);
    expect(cli.execute('scale ' + id + ' 2')).not.toMatch(/^error:/u);
    expect(cli.execute('tree ' + id)).toContain(expected);
    cli.execute('undo');
    cli.execute('redo');
    expect(cli.execute('tree ' + id)).toContain(expected);
  });
  it('requires a document but permits help and comments before init', () => {
    const empty = new CommandRouter();
    expect(empty.execute('tree')).toBe("error: no document. use 'init' or 'read' first");
    expect(empty.execute('undo')).toBe("error: no document. use 'init' or 'read' first");
    expect(empty.execute('help')).toContain('create rect');
    expect(empty.execute('# comment')).toBeUndefined();
  });
  it('uses default canvas sizes, one init dimension and floating point coordinates', () => {
    expect(cli.execute('canvas')).toBe('canvas 800x600');
    expect(cli.execute('init 400')).toBe('canvas 400x600 created');
    cli.execute('create rect r -1.5 2.5 3 4');
    cli.execute('move r 0.5 -0.5');
    expect(cli.execute('tree r')).toContain('x=-1 y=2 w=3 h=4');
  });
  it('has case-sensitive ids and does not materialize SVG default styles', () => {
    cli.execute('create rect r 0 0 1 1');
    expect(cli.execute('create g R')).toBe('g#R created');
    expect(cli.execute('create g r')).toBe('error: id already exists: r');
    expect(cli.execute('show r')).not.toContain('fill=');
    expect(cli.execute('show r')).not.toContain('stroke=');
  });
  it('edits and restores text including empty content', () => {
    cli.execute('create text t 0 0 "My Diagram"');
    cli.execute('set t text ""');
    expect(cli.execute('show t')).toContain('text=""');
    cli.execute('undo');
    expect(cli.execute('show t')).toContain('text="My Diagram"');
  });
  it.each([
    ['create circle c 0 0 -1', 'r must not be negative'],
    ['create box n 0 0 1 1 "title"', 'unknown shape type: box (is the plugin loaded?)'],
    ['create hexagon h', 'unknown shape type: hexagon'],
    ['move r NaN 0', 'parameter 2 must be a finite number'],
    ['move r Infinity 0', 'parameter 2 must be a finite number'],
    ['scale r 0', 'scale factor must be positive'],
    ['scale r -1', 'scale factor must be positive'],
    ['set r radius 3', 'unknown attribute: radius'],
    ['set r text "bad"', 'unknown attribute: text'],
    ['set r width -1', 'width must not be negative'],
    ['set r stroke-width -1', 'stroke-width must not be negative'],
    ['create circle c 0 0 1 in missing', 'no such container: missing'],
    ['create circle c 0 0 1 in r', 'not a container: r'],
    ['move missing 1 2', 'no such shape: missing'],
    ['move r 1', 'usage: move'],
    ['canvas 400 300 200', 'usage: canvas'],
    ['set r fill "unfinished', 'unterminated double quote'],
  ])('preserves document and redo after failure: %s', (command, error) => {
    cli.execute('create rect r 1 2 3 4');
    const original = cli.execute('tree');
    cli.execute('move r 5 6');
    const moved = cli.execute('tree');
    cli.execute('undo');
    expect(cli.execute(command)).toContain('error: ' + error);
    expect(cli.execute('tree')).toBe(original);
    expect(cli.execute('redo')).not.toMatch(/^error:/u);
    expect(cli.execute('tree')).toBe(moved);
  });
  it('skips display commands in history and clears redo on a new edit', () => {
    cli.execute('create rect r 0 0 1 1');
    cli.execute('move r 10 0');
    cli.execute('undo');
    cli.execute('tree');
    cli.execute('show r');
    cli.execute('help');
    cli.execute('canvas');
    expect(cli.execute('redo')).not.toMatch(/^error:/u);
    cli.execute('undo');
    cli.execute('set r fill red');
    expect(cli.execute('redo')).toBe('error: nothing to redo');
  });
  it('accepts one canvas dimension, preserves height and starts a new history baseline', () => {
    cli.execute('canvas 800 320');
    cli.execute('create g scene');
    expect(cli.execute('canvas 480')).toBe('canvas resized to 480x320');
    expect(cli.execute('canvas')).toBe('canvas 480x320');
    expect(cli.execute('undo')).toBe('error: undo not allowed after io command');
    expect(cli.execute('redo')).toBe('error: undo not allowed after io command');
    cli.execute('create g next');
    cli.execute('undo');
    expect(cli.execute('tree')).toBe('svg (480x320)\n└── g#scene');
  });
  it('preserves the document and redo after an invalid single canvas dimension', () => {
    cli.execute('create g scene');
    cli.execute('move scene 1 2');
    cli.execute('undo');
    const before = cli.execute('tree');
    expect(cli.execute('canvas 0')).toBe('error: canvas width must be positive');
    expect(cli.execute('tree')).toBe(before);
    expect(cli.execute('redo')).not.toMatch(/^error:/u);
  });
  it('resets history after document changes and gives new edits a fresh baseline', () => {
    expect(cli.execute('undo')).toBe('error: undo not allowed after io command');
    cli.execute('create g g');
    cli.execute('canvas 400 300');
    expect(cli.execute('undo')).toBe('error: undo not allowed after io command');
    expect(cli.execute('redo')).toBe('error: undo not allowed after io command');
    cli.execute('create g h');
    cli.execute('undo');
    expect(cli.execute('tree')).toContain('g#g');
    expect(cli.execute('tree')).not.toContain('g#h');
    expect(cli.execute('canvas')).toBe('canvas 400x300');
    expect(cli.execute('undo')).toBe('error: nothing to undo');
    cli.execute('init');
    expect(cli.execute('tree')).toBe('svg (800x600)');
  });
  it('keeps the document and history after an invalid init or canvas change', () => {
    cli.execute('create g g');
    const before = cli.execute('tree');
    expect(cli.execute('init 0 200')).toMatch(/^error:/u);
    expect(cli.execute('canvas 300 -1')).toMatch(/^error:/u);
    expect(cli.execute('tree')).toBe(before);
    cli.execute('undo');
    expect(cli.execute('tree')).toBe('svg (800x600)');
  });
  it('reports missing store configuration without changing document or history', () => {
    cli.execute('create g g');
    expect(cli.execute('save demo.svg')).toContain('document storage is not configured');
    expect(cli.execute('read other.svg')).toContain('document storage is not configured');
    cli.execute('undo');
    expect(cli.execute('tree')).toBe('svg (800x600)');
  });
  it('formats errors on one line even with a newline inside quoted input', () => {
    expect(cli.execute('unknown "a\nb"')).toBe('error: unknown command: unknown');
    expect(cli.execute('delete "a\nb"')).toBe('error: no such shape: a b');
  });
});
