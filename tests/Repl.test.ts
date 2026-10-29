import { PassThrough } from 'node:stream';
import { setImmediate } from 'node:timers/promises';
import { expect, it } from 'vitest';
import { Repl } from '../src/cli/Repl.js';

it('replays streams, continues after errors and handles EOF without a newline', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  let transcript = '';
  output.on('data', chunk => { transcript += String(chunk); });
  new Repl().run(input, output, false);
  input.end('# comment\r\ninit\r\ncreate text t 1 2 "开始"\r\nmove missing 1 1\r\nshow t');
  await setImmediate();
  expect(transcript).toContain('canvas 800x600 created\n');
  expect(transcript).toContain('error: no such shape: missing\n');
  expect(transcript).toContain('text="开始"');
  expect(transcript).not.toContain('svg>');
});
