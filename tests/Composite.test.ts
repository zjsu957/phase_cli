import { beforeEach, describe, expect, it } from 'vitest';
import { CommandRouter } from '../src/cli/CommandRouter.js';

describe('Composite and structural commands', () => {
  let cli: CommandRouter;
  beforeEach(() => {
    cli = new CommandRouter();
    cli.execute('init');
    cli.execute('create g scene');
    cli.execute('create g node in scene');
    cli.execute('create rect r 1 2 3 4 in node');
    cli.execute('create text t 5 6 "label" in node');
  });
  it('moves and scales nested containers and restores all children exactly', () => {
    const original = cli.execute('tree');
    cli.execute('move scene 10 20');
    expect(cli.execute('tree r')).toContain('x=11 y=22');
    expect(cli.execute('tree t')).toContain('(15,26)');
    cli.execute('scale scene 2');
    expect(cli.execute('tree r')).toContain('x=22 y=44 w=6 h=8');
    cli.execute('undo');
    cli.execute('undo');
    expect(cli.execute('tree')).toBe(original);
    cli.execute('redo');
    cli.execute('redo');
    expect(cli.execute('tree t')).toContain('(30,52)');
  });
  it('discards partial working-copy changes on numeric overflow', () => {
    cli.execute('create circle huge 1e308 0 1 in node');
    const original = cli.execute('tree');
    expect(cli.execute('scale scene 2')).toMatch(/^error:/u);
    expect(cli.execute('tree')).toBe(original);
    cli.execute('undo');
    expect(cli.execute('show huge')).toBe('error: no such shape: huge');
  });
  it('deletes a subtree and restores descendants, order and ids in one undo', () => {
    const original = cli.execute('tree');
    cli.execute('delete node');
    expect(cli.execute('show r')).toBe('error: no such shape: r');
    cli.execute('undo');
    expect(cli.execute('tree')).toBe(original);
    expect(cli.execute('create g r')).toBe('error: id already exists: r');
    cli.execute('redo');
    expect(cli.execute('create g r')).toBe('g#r created');
  });
  it('groups siblings in document order independently of argument order', () => {
    const original = cli.execute('tree');
    expect(cli.execute('group pair t r')).toBe('g#pair created with 2 children');
    expect(cli.execute('tree pair')).toBe('g#pair\n├── rect#r  x=1 y=2 w=3 h=4\n└── text#t  (5,6) "label"');
    expect(cli.execute('show pair')).toContain('parent=g#node');
    cli.execute('undo');
    expect(cli.execute('tree')).toBe(original);
  });
  it('groups across parents, retaining document order and geometry', () => {
    cli.execute('create circle c 10 20 3 in scene');
    const original = cli.execute('tree');
    cli.execute('group mixed c r');
    expect(cli.execute('show mixed')).toContain('parent=svg');
    expect(cli.execute('show r')).toContain('parent=g#mixed');
    const subtree = cli.execute('tree mixed')!;
    expect(subtree.indexOf('rect#r')).toBeLessThan(subtree.indexOf('circle#c'));
    cli.execute('undo');
    expect(cli.execute('tree')).toBe(original);
  });
  it.each([
    ['group bad r node', 'cannot group a container into its own descendant: node'],
    ['group bad node r', 'cannot group a container into its own descendant: node'],
    ['group bad r r', 'duplicate group member'],
    ['addto node scene', 'cannot move a container into its own descendant: scene'],
    ['addto node node', 'cannot move a container into its own descendant: node'],
    ['ungroup scene', 'cannot ungroup top-level container: scene'],
  ])('rejects structural errors atomically: %s', (command, message) => {
    const before = cli.execute('tree');
    expect(cli.execute(command)).toBe('error: ' + message);
    expect(cli.execute('tree')).toBe(before);
    cli.execute('undo');
    expect(cli.execute('show t')).toBe('error: no such shape: t');
  });
  it('ungroups at the old position and restores the container on undo', () => {
    cli.execute('create circle c 0 0 1 in scene');
    const before = cli.execute('tree');
    expect(cli.execute('ungroup node')).toContain('2 children promoted');
    const tree = cli.execute('tree')!;
    expect(tree.indexOf('rect#r')).toBeLessThan(tree.indexOf('text#t'));
    expect(tree.indexOf('text#t')).toBeLessThan(tree.indexOf('circle#c'));
    expect(cli.execute('show r')).toContain('parent=g#scene');
    cli.execute('undo');
    expect(cli.execute('tree')).toBe(before);
  });
  it('moves a node to the last child position and preserves geometry', () => {
    const before = cli.execute('tree');
    cli.execute('addto scene r');
    expect(cli.execute('tree scene')!.split('\n').at(-1)).toContain('└── rect#r  x=1 y=2 w=3 h=4');
    cli.execute('undo');
    expect(cli.execute('tree')).toBe(before);
  });
  it('front is last painted and back is first painted among siblings', () => {
    const before = cli.execute('tree');
    cli.execute('front r');
    expect(cli.execute('tree node')!.split('\n').at(-1)).toContain('rect#r');
    cli.execute('back r');
    expect(cli.execute('tree node')!.split('\n')[1]).toContain('rect#r');
    cli.execute('undo');
    cli.execute('undo');
    expect(cli.execute('tree')).toBe(before);
  });
  it('sets group appearance without overwriting explicit descendant styles', () => {
    cli.execute('set r fill red');
    cli.execute('set node fill blue');
    expect(cli.execute('show node')).toContain('fill=blue');
    expect(cli.execute('show r')).toContain('fill=red');
  });
});
