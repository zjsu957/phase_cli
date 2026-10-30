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
import type { Arguments } from './Arguments.js';
import { CommandDefinition } from './CommandDefinition.js';
import { Tokenizer } from './Tokenizer.js';

export class CommandRouter {
  private readonly tokenizer = new Tokenizer();
  // The only command-name dispatch. Provider-based registration remains future work.
  private readonly definitions: ReadonlyMap<string, CommandDefinition>;

  constructor(private readonly editor = new Editor()) {
    const definitions = [
      new CommandDefinition('init', '[w] [h]', 0, 2, a =>
        this.editor.init(a.length >= 1 ? a.number(0) : 800, a.length >= 2 ? a.number(1) : 600)),
      new CommandDefinition('read', '<file.svg>', 1, 1, a => this.editor.read(a.text(0))),
      new CommandDefinition('save', '[file.svg]', 0, 1, a => this.editor.save(a.all[0])),
      new CommandDefinition('canvas', '[w] [h]', 0, 2, a =>
        this.editor.canvas(a.length >= 1 ? a.number(0) : undefined, a.length >= 2 ? a.number(1) : undefined)),
      new CommandDefinition('create', '<type> <id> [params...] [in <containerId>]', 2, Infinity,
        a => this.create(a)),
      new CommandDefinition('delete', '<id>', 1, 1,
        a => this.editor.edit(new DeleteCommand(a.text(0)))),
      new CommandDefinition('move', '<id> <dx> <dy>', 3, 3,
        a => this.editor.edit(new MoveCommand(a.text(0), a.number(1), a.number(2)))),
      new CommandDefinition('scale', '<id> <factor>', 2, 2,
        a => this.editor.edit(new ScaleCommand(a.text(0), a.number(1)))),
      new CommandDefinition('set', '<id> <attr> <value>', 3, 3,
        a => this.editor.edit(new SetCommand(a.text(0), a.text(1), a.text(2)))),
      new CommandDefinition('group', '<newGid> <id1> <id2>...', 2, Infinity,
        a => this.editor.edit(new GroupCommand(a.text(0), a.all.slice(1)))),
      new CommandDefinition('ungroup', '<gid>', 1, 1,
        a => this.editor.edit(new UngroupCommand(a.text(0)))),
      new CommandDefinition('addto', '<gid> <id>', 2, 2,
        a => this.editor.edit(new AddToCommand(a.text(0), a.text(1)))),
      new CommandDefinition('front', '<id>', 1, 1,
        a => this.editor.edit(new FrontCommand(a.text(0)))),
      new CommandDefinition('back', '<id>', 1, 1,
        a => this.editor.edit(new BackCommand(a.text(0)))),
      new CommandDefinition('tree', '[id]', 0, 1, a => this.editor.tree(a.all[0])),
      new CommandDefinition('show', '<id>', 1, 1, a => this.editor.show(a.text(0))),
      new CommandDefinition('help', '', 0, 0, () => this.help()),
      new CommandDefinition('undo', '', 0, 0, () => this.editor.undo()),
      new CommandDefinition('redo', '', 0, 0, () => this.editor.redo()),
    ];
    this.definitions = new Map(definitions.map(definition => [definition.name, definition]));
  }
  execute(line: string): string | undefined {
    try {
      const [commandToken, ...args] = this.tokenizer.scan(line);
      if (commandToken === undefined) return undefined;
      const name = commandToken.value;
      const definition = this.definitions.get(name);
      if (!definition) throw new EditorError('unknown command: ' + name);
      return definition.execute(args);
    } catch (error) {
      if (error instanceof EditorError) return 'error: ' + error.message.replace(/[\r\n]+/gu, ' ');
      throw error;
    }
  }
  private create(args: Arguments): string {
    let values = args.all;
    let parentId: string | undefined;
    if (values.length >= 4 && values.at(-2) === 'in' && !args.isQuoted(-2)) {
      parentId = values.at(-1)!;
      values = values.slice(0, -2);
    } else if (values.length > 2 && values.at(-1) === 'in' && !args.isQuoted(-1)) {
      args.failUsage();
    }
    return this.editor.edit(new CreateCommand(values[0]!, values[1]!, values.slice(2), parentId));
  }
  private help(): string {
    return [
      ...[...this.definitions.values()].map(definition => definition.syntax),
      '',
      ...this.editor.creationSyntax,
      'set: fill | stroke | stroke-width | geometry attributes | text (text only)',
      'Numbers: decimal or exponent notation; quoted arguments must be separated by whitespace.',
      'Lines beginning with # are comments. Ctrl+C or EOF closes the CLI.',
    ].join('\n');
  }
}
