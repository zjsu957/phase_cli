import { describe, expect, it } from 'vitest';
import { Editor } from '../src/application/Editor.js';
import { MoveCommand } from '../src/application/commands/MoveCommand.js';
import { CreateCommand } from '../src/application/commands/CreateCommand.js';
import { CommandRouter } from '../src/cli/CommandRouter.js';

describe('long editing sequences and command history ownership', () => {
  it('keeps history intact when a caller tries to execute the same command instance twice', () => {
    const editor = new Editor();
    editor.init();
    editor.edit(new CreateCommand('rect', 'r', ['1', '2', '3', '4']));
    const move = new MoveCommand('r', 10, 20);
    editor.edit(move);
    const moved = editor.tree();
    expect(() => editor.edit(move)).toThrow('command has already been executed');
    expect(editor.tree()).toBe(moved);
    editor.undo();
    expect(editor.tree('r')).toContain('x=1 y=2 w=3 h=4');
    editor.redo();
    expect(editor.tree()).toBe(moved);
  });

  it('allows retrying an instance that failed before successful execution', () => {
    const editor = new Editor();
    editor.init();
    const move = new MoveCommand('r', 10, 20);
    expect(() => editor.edit(move)).toThrow('no such shape: r');
    editor.edit(new CreateCommand('rect', 'r', ['1', '2', '3', '4']));
    editor.edit(move);
    expect(editor.tree('r')).toContain('x=11 y=22');
    editor.undo();
    expect(editor.tree('r')).toContain('x=1 y=2');
  });

  it('restores every intermediate state through nested structural edits and their full redo', () => {
    const cli = new CommandRouter();
    cli.execute('init');
    const states = [cli.execute('tree')];
    const edits = [
      'create g scene', 'create g left in scene', 'create g right in scene',
      'create rect r 1.25 2.5 30 40 in left',
      'create text label 3 4 "开始" in left',
      'create circle c 100 100 20 in right',
      'create ellipse e 90 90 10 5 in right',
      'create line edge 1 2 3 4 black in scene',
      'group pair label r', 'move pair .1 .2', 'scale pair 1.1',
      'set pair stroke blue', 'addto right pair',
      'front c', 'back e', 'ungroup pair',
      'group mixed edge r', 'delete right',
    ];
    for (const edit of edits) {
      expect(cli.execute(edit), edit).not.toMatch(/^error:/u);
      states.push(cli.execute('tree'));
    }
    for (let index = states.length - 2; index >= 0; index--) {
      expect(cli.execute('undo')).not.toMatch(/^error:/u);
      expect(cli.execute('tree')).toBe(states[index]);
    }
    expect(cli.execute('undo')).toBe('error: nothing to undo');
    for (let index = 1; index < states.length; index++) {
      expect(cli.execute('redo')).not.toMatch(/^error:/u);
      expect(cli.execute('tree')).toBe(states[index]);
    }
    expect(cli.execute('redo')).toBe('error: nothing to redo');
  });
});
