import { stdin, stdout } from 'node:process';
import { Repl } from './cli/Repl.js';

new Repl().run(stdin, stdout, Boolean(stdin.isTTY && stdout.isTTY));
