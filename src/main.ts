import { stdin, stdout } from 'node:process';
import { Repl } from './cli/Repl.js';
import { CommandRouter } from './cli/CommandRouter.js';
import { Editor } from './application/Editor.js';
import { NodeDocumentStore } from './infrastructure/files/NodeDocumentStore.js';

const editor = new Editor(new NodeDocumentStore());
new Repl(new CommandRouter(editor)).run(stdin, stdout, Boolean(stdin.isTTY && stdout.isTTY));
