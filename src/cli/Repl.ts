import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { CommandRouter } from './CommandRouter.js';

export class Repl {
  constructor(private readonly router = new CommandRouter()) {}

  run(input: Readable, output: Writable, interactive: boolean): void {
    const reader = createInterface({ input, output, terminal: interactive });
    reader.setPrompt('svg> ');
    if (interactive) {
      output.write("svg-editor 0.5 — type 'help' for commands\n");
      reader.prompt();
    }
    reader.on('line', line => {
      const result = this.router.execute(line);
      if (result !== undefined) output.write(result + '\n');
      if (interactive) reader.prompt();
    });
    reader.on('SIGINT', () => {
      output.write('\n');
      reader.close();
    });
  }
}
