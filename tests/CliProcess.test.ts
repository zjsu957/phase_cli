import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SvgParser } from '../src/infrastructure/svg/SvgParser.js';

describe('real CLI process acceptance', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const loader = import.meta.resolve('tsx');
  let directory: string;
  beforeEach(() => { directory = mkdtempSync(join(tmpdir(), 'svg-cli-acceptance-')); });
  afterEach(() => {
    const target = resolve(directory);
    if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith('svg-cli-acceptance-')) {
      throw new Error('Refusing to remove an unexpected acceptance directory');
    }
    rmSync(target, { recursive: true, force: true });
  });

  // tsx is an absolute loader URL so this also works from a directory without node_modules.
  const run = (commands: string): string => {
    const result = spawnSync(process.execPath, ['--import', loader, join(root, 'src', 'main.ts')], {
      cwd: directory, input: commands, encoding: 'utf8', timeout: 20000,
    });
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).not.toMatch(/^svg> /mu);
    return result.stdout;
  };

  it('replays the lab transcript, including exact errors, undo/redo, save barrier and unnamed import', () => {
    copyFileSync(join(root, 'examples', 'other.svg'), join(directory, 'other.svg'));
    const output = run([
      '# Lab section 6', 'init 800 600',
      'create rect bg 0 0 800 600 #ffffff',
      'create text title 20 40 "My Diagram"',
      'create circle c1 100 100 20 red',
      'create rect box 200 80 60 60 #3366ff',
      'group markers c1 box', 'tree',
      'move c1 30 0', 'undo', 'show c1', 'redo', 'show c1',
      'set title text "My Diagram v2"', 'undo', 'show title',
      'group bad c1 markers', 'delete box', 'undo',
      'save demo.svg', 'undo', 'read other.svg', 'tree',
    ].join('\r\n'));
    expect(output).toContain('g#markers created with 2 children');
    expect(output).toContain('cx=100');
    expect(output).toContain('cx=130');
    expect(output).toContain('text="My Diagram"');
    expect(output.split('\n').filter(line => line.startsWith('error:'))).toEqual([
      'error: cannot group a container into its own descendant: markers',
      'error: undo not allowed after io command',
    ]);
    expect(output).toContain('saved to demo.svg (5 elements)');
    expect(output).toContain('warning: assigned id rect1 to unnamed <rect>\nread other.svg (7 elements)');
    expect(output).toContain('svg (400x300)');
    const saved = new SvgParser().parse(readFileSync(join(directory, 'demo.svg'), 'utf8')).document;
    expect(saved.elementCount).toBe(5);
    expect(saved.parentOf('box')?.id).toBe('markers');
    expect(saved.find('title').attributes.get('text')).toBe('My Diagram');
    expect(saved.find('c1').attributes.get('cx')).toBe('130');
  });

  it('covers remaining commands, all shapes, structural operations and the new editing baseline', () => {
    const output = run([
      'help', 'init', 'canvas',
      'create g scene', 'create g node in scene',
      'create rect r 1 2 3 4 in node',
      'create text t 5 6 "开始" in node',
      'create circle c 10 20 5 in scene',
      'create ellipse e 10 20 3 4 in scene',
      'create line l 1 2 3 4 black in scene',
      'set scene fill blue', 'move node 10 20', 'scale node 2',
      'group pair t r', 'addto node c', 'front c', 'back c', 'ungroup pair',
      'tree node', 'show r', 'canvas 500 400',
      'save "all shapes.svg"', 'create g last', 'undo', 'redo',
      'save', 'read "all shapes.svg"', 'show r', 'tree',
    ].join('\n'));
    expect(output.split('\n').filter(line => line.startsWith('error:'))).toEqual([]);
    expect(output).toContain('canvas 800x600');
    expect(output).toContain('canvas resized to 500x400');
    expect(output).toContain('g#pair ungrouped (2 children promoted)');
    expect(output).toContain('rect#r  parent=g#node');
    expect(output).toContain('x=22');
    expect(output).toContain('y=44');
    const saved = new SvgParser().parse(readFileSync(join(directory, 'all shapes.svg'), 'utf8')).document;
    expect(saved.width).toBe(500);
    expect(saved.height).toBe(400);
    expect(saved.elementCount).toBe(8);
    expect(saved.children.map(shape => shape.id)).toEqual(['scene', 'last']);
    expect(saved.find('node').children.map(shape => shape.id)).toEqual(['c', 'r', 't']);
    expect(saved.find('t').attributes.get('text')).toBe('开始');
  });

  it('continues after malformed commands and preserves redo plus the saved file on failed reads and writes', () => {
    writeFileSync(join(directory, 'broken.svg'), '<svg><rect></svg>', 'utf8');
    const output = run([
      'init', 'create rect r 0 0 10 10', 'save state.svg',
      'move r 10 20', 'undo',
      'read missing.svg', 'read broken.svg',
      'save missing-parent/out.svg',
      'set r mystery 1', 'move r NaN 0', 'set r fill "red"tail',
      'redo', 'show r',
    ].join('\n'));
    expect(output.split('\n').filter(line => line.startsWith('error:'))).toHaveLength(6);
    expect(output).toContain('error: cannot read file: missing.svg');
    expect(output).toContain('error: invalid SVG: malformed XML');
    expect(output).toContain('error: cannot write file: missing-parent/out.svg');
    expect(output).toContain('x=10');
    expect(output).toContain('y=20');
    const original = new SvgParser().parse(readFileSync(join(directory, 'state.svg'), 'utf8')).document;
    expect(original.find('r').attributes.get('x')).toBe('0');
    expect(existsSync(join(directory, 'missing-parent'))).toBe(false);
  });

  it('replays the documented flowchart script from an isolated working directory', () => {
    const script = readFileSync(join(root, 'examples', 'flowchart.txt'), 'utf8');
    const output = run(script);
    expect(output.split('\n').filter(line => line.startsWith('error:'))).toEqual([
      'error: undo not allowed after io command',
    ]);
    expect(output).toContain('saved to flowchart.svg (8 elements)');
    expect(output).toContain('read flowchart.svg (8 elements)');
    const doc = new SvgParser().parse(readFileSync(join(directory, 'flowchart.svg'), 'utf8')).document;
    expect(doc.find('process').attributes.get('y')).toBe('100');
    expect(doc.find('process-label').attributes.get('text')).toBe('处理数据 v2');
  });

  it('preserves imported control whitespace through an edit and save in the real process', () => {
    writeFileSync(join(directory, 'text.svg'),
      '<svg><text id="t" x="1" y="2">a&#13;b\u0085c\u2028d</text></svg>', 'utf8');
    const output = run('read text.svg\nmove t 10 0\nsave\nread text.svg\nshow t');
    expect(output).not.toContain('error:');
    const doc = new SvgParser().parse(readFileSync(join(directory, 'text.svg'), 'utf8')).document;
    expect(doc.find('t').attributes.get('text')).toBe('a\rb\u0085c\u2028d');
    expect(doc.find('t').attributes.get('x')).toBe('11');
  });
});
