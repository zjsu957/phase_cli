import { Editor } from '../application/Editor.js';
import { AddToCommand } from '../application/commands/AddToCommand.js';
import { BackCommand } from '../application/commands/BackCommand.js';
import { CreateCommand } from '../application/commands/CreateCommand.js';
import { DeleteCommand } from '../application/commands/DeleteCommand.js';
import { FrontCommand } from '../application/commands/FrontCommand.js';
import { GroupCommand } from '../application/commands/GroupCommand.js';
import { MoveCommand } from '../application/commands/MoveCommand.js';
import { ScaleCommand } from '../application/commands/ScaleCommand.js';
import { SetCommand } from '../application/commands/SetCommand.js';
import { UngroupCommand } from '../application/commands/UngroupCommand.js';
import { EditorError } from '../domain/EditorError.js';
import { Arguments } from './Arguments.js';
import { Tokenizer } from './Tokenizer.js';

export class CommandRouter {
  private readonly tokenizer = new Tokenizer();
  // Phase 1's single command-name dispatch point; registry extraction is planned.
  private readonly handlers: ReadonlyMap<string, (args: readonly string[]) => string>;
  private readonly usages: ReadonlyMap<string, string>;

  constructor(private readonly editor = new Editor()) {
    this.usages = new Map([
      ['init', 'init [w] [h]'],
      ['read', 'read <file.svg>'],
      ['save', 'save [file.svg]'],
      ['canvas', 'canvas [w] [h]'],
      ['create', 'create <rect|circle|ellipse|line|text|g> <id> [params...] [in <containerId>]'],
      ['delete', 'delete <id>'],
      ['move', 'move <id> <dx> <dy>'],
      ['scale', 'scale <id> <factor>'],
      ['set', 'set <id> <attr> <value>'],
      ['group', 'group <newGid> <id1> <id2>...'],
      ['ungroup', 'ungroup <gid>'],
      ['addto', 'addto <gid> <id>'],
      ['front', 'front <id>'],
      ['back', 'back <id>'],
      ['tree', 'tree [id]'],
      ['show', 'show <id>'],
      ['help', 'help'],
      ['undo', 'undo'],
      ['redo', 'redo'],
    ]);
    this.handlers = new Map([
      ['init', args => this.init(args)],
      ['read', args => { const a = this.args('read', args).count(1); return this.editor.read(a.text(0)); }],
      ['save', args => { this.args('save', args).count(0, 1); return this.editor.save(args[0]); }],
      ['canvas', args => this.canvas(args)],
      ['create', args => this.create(args)],
      ['delete', args => {
        const a = this.args('delete', args).count(1);
        return this.editor.edit(new DeleteCommand(a.text(0)));
      }],
      ['move', args => {
        const a = this.args('move', args).count(3);
        return this.editor.edit(new MoveCommand(a.text(0), a.number(1), a.number(2)));
      }],
      ['scale', args => {
        const a = this.args('scale', args).count(2);
        return this.editor.edit(new ScaleCommand(a.text(0), a.number(1)));
      }],
      ['set', args => {
        const a = this.args('set', args).count(3);
        return this.editor.edit(new SetCommand(a.text(0), a.text(1), a.text(2)));
      }],
      ['group', args => {
        const a = this.args('group', args).count(2, Number.POSITIVE_INFINITY);
        return this.editor.edit(new GroupCommand(a.text(0), args.slice(1)));
      }],
      ['ungroup', args => {
        const a = this.args('ungroup', args).count(1);
        return this.editor.edit(new UngroupCommand(a.text(0)));
      }],
      ['addto', args => {
        const a = this.args('addto', args).count(2);
        return this.editor.edit(new AddToCommand(a.text(0), a.text(1)));
      }],
      ['front', args => {
        const a = this.args('front', args).count(1);
        return this.editor.edit(new FrontCommand(a.text(0)));
      }],
      ['back', args => {
        const a = this.args('back', args).count(1);
        return this.editor.edit(new BackCommand(a.text(0)));
      }],
      ['tree', args => { this.args('tree', args).count(0, 1); return this.editor.tree(args[0]); }],
      ['show', args => { const a = this.args('show', args).count(1); return this.editor.show(a.text(0)); }],
      ['help', args => { this.args('help', args).count(0); return this.help(); }],
      ['undo', args => { this.args('undo', args).count(0); return this.editor.undo(); }],
      ['redo', args => { this.args('redo', args).count(0); return this.editor.redo(); }],
    ]);
  }
  execute(line: string): string | undefined {
    try {
      const [name, ...args] = this.tokenizer.tokenize(line);
      if (name === undefined) return undefined;
      const handler = this.handlers.get(name);
      if (!handler) throw new EditorError('unknown command: ' + name);
      return handler(args);
    } catch (error) {
      if (error instanceof EditorError) return 'error: ' + error.message.replace(/[\r\n]+/gu, ' ');
      throw error;
    }
  }
  private args(name: string, values: readonly string[]): Arguments {
    return new Arguments(values, this.usages.get(name)!);
  }
  private init(args: readonly string[]): string {
    const a = this.args('init', args).count(0, 2);
    return this.editor.init(args.length >= 1 ? a.number(0) : 800, args.length >= 2 ? a.number(1) : 600);
  }
  private canvas(args: readonly string[]): string {
    const a = this.args('canvas', args);
    if (args.length === 0) return this.editor.canvas();
    a.count(2);
    return this.editor.canvas(a.number(0), a.number(1));
  }
  private create(args: readonly string[]): string {
    this.args('create', args).count(2, Number.POSITIVE_INFINITY);
    let values = [...args];
    let parentId: string | undefined;
    if (values.length >= 4 && values.at(-2) === 'in') {
      parentId = values.at(-1)!;
      values = values.slice(0, -2);
    }
    return this.editor.edit(new CreateCommand(values[0]!, values[1]!, values.slice(2), parentId));
  }
  private help(): string {
    return [
      ...this.usages.values(),
      '',
      'create rect <id> <x> <y> <w> <h> [fill] [in <containerId>]',
      'create circle <id> <cx> <cy> <r> [fill] [in <containerId>]',
      'create ellipse <id> <cx> <cy> <rx> <ry> [fill] [in <containerId>]',
      'create line <id> <x1> <y1> <x2> <y2> [stroke] [in <containerId>]',
      'create text <id> <x> <y> "content" [in <containerId>]',
      'create g <id> [in <containerId>]',
      'set: fill | stroke | stroke-width | geometry attributes | text (text only)',
      'Lines beginning with # are comments. Ctrl+C or EOF closes the CLI.',
    ].join('\n');
  }
}
