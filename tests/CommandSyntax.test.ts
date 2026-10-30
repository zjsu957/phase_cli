import { beforeEach, describe, expect, it } from 'vitest';
import { CommandRouter } from '../src/cli/CommandRouter.js';

describe('command syntax, help and failed-command history', () => {
  let cli: CommandRouter;
  beforeEach(() => {
    cli = new CommandRouter();
    cli.execute('init');
    cli.execute('create g scene');
    cli.execute('create text t 1 2 "original" in scene');
    cli.execute('set t text "changed"');
    cli.execute('undo');
  });

  it.each([
    'init 800 600 extra', 'read', 'save a.svg b.svg', 'canvas 800',
    'create', 'delete', 'move t 1', 'scale t 2 extra', 'set t text',
    'group new', 'ungroup', 'addto scene', 'front t extra', 'back',
    'tree t extra', 'show', 'help extra', 'undo extra', 'redo extra',
    'create rect r 1 2 3', 'create circle c 0 0', 'create ellipse e 0 0 1',
    'create line l 0 0 1', 'create text bad 0 0', 'create g bad extra',
    'create rect r 0 0 1 1 in', 'create text bad 0 0 "a" in',
    'create text bad 0 0 "a" "in" scene',
  ])('reports usage and keeps the document plus redo intact: %s', command => {
    const before = cli.execute('tree');
    expect(cli.execute(command)).toMatch(/^error: usage:/u);
    expect(cli.execute('tree')).toBe(before);
    expect(cli.execute('redo')).not.toMatch(/^error:/u);
    expect(cli.execute('show t')).toContain('text="changed"');
  });

  it('includes the same concrete syntax in help and invalid creation errors', () => {
    const help = cli.execute('help')!;
    for (const creation of ['rect r', 'circle c', 'ellipse e', 'line l', 'text t', 'g g extra']) {
      const result = cli.execute('create ' + creation)!;
      expect(result).toMatch(/^error: usage: create /u);
      expect(help.split('\n')).toContain(result.slice('error: usage: '.length));
    }
    const names = help.split('\n\n')[0]!.split('\n').map(syntax => syntax.split(' ')[0]);
    expect(names).toHaveLength(19);
    expect(new Set(names).size).toBe(19);
  });

  it('allows quoted in as text and as an id while retaining nested creation', () => {
    expect(cli.execute('create g in')).toBe('g#in created');
    expect(cli.execute('create text keyword 0 0 "in" in in')).toBe('text#keyword created in g#in');
    expect(cli.execute('show keyword')).toContain('parent=g#in');
    expect(cli.execute('tree keyword')).toContain('"in"');
    expect(cli.execute('create rect literal 0 0 1 1 "in"')).toBe('rect#literal created');
    expect(cli.execute('show literal')).toContain('parent=svg');
    expect(cli.execute('show literal')).toContain('fill=in');
  });

  it('preserves redo after malformed quoted input', () => {
    const before = cli.execute('tree');
    expect(cli.execute('set t text "hello"tail')).toContain('quoted arguments must be separated');
    expect(cli.execute('tree')).toBe(before);
    expect(cli.execute('redo')).not.toMatch(/^error:/u);
    expect(cli.execute('show t')).toContain('text="changed"');
  });
});
