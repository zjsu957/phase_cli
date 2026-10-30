import { Arguments } from './Arguments.js';
import type { CommandToken } from './CommandToken.js';

/** Syntax, arity validation and execution stay together for every CLI command. */
export class CommandDefinition {
  constructor(
    private readonly commandName: string,
    private readonly parameters: string,
    private readonly minimum: number,
    private readonly maximum: number,
    private readonly action: (args: Arguments) => string,
  ) {}
  get name(): string { return this.commandName; }
  get syntax(): string { return [this.name, this.parameters].filter(Boolean).join(' '); }
  execute(values: readonly CommandToken[]): string {
    return this.action(new Arguments(values, this.syntax).count(this.minimum, this.maximum));
  }
}
