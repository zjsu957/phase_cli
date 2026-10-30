import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Editor } from '../src/application/Editor.js';
import { CommandRouter } from '../src/cli/CommandRouter.js';
import { NodeDocumentStore } from '../src/infrastructure/files/NodeDocumentStore.js';

describe('SVG file commands and history', () => {
  let directory: string;
  let cli: CommandRouter;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'svg-editor-test-'));
    cli = new CommandRouter(new Editor(new NodeDocumentStore()));
  });
  afterEach(() => {
    // Validate the exact generated temporary directory before recursively removing it.
    if (dirname(resolve(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith('svg-editor-test-')) {
      throw new Error('Refusing to remove an unexpected test path');
    }
    rmSync(directory, { recursive: true, force: true });
  });

  it('saves, reads and edits the actual current document, including paths with spaces', () => {
    const path = join(directory, '我的 diagram.svg');
    cli.execute('init 400 200');
    cli.execute('create g scene');
    cli.execute('create rect r 10 20 100 50 #4a90d9 in scene');
    cli.execute('create text t 20 50 "开始" in scene');
    cli.execute('move scene 30 0');
    const original = cli.execute('tree');
    expect(cli.execute('save "' + path + '"')).toBe('saved to ' + path + ' (3 elements)');
    expect(readFileSync(path, 'utf8')).toContain('x="40"');
    cli.execute('init');
    expect(cli.execute('read "' + path + '"')).toBe('read ' + path + ' (3 elements)');
    expect(cli.execute('tree')).toBe(original);
  });

  it('reads without init and prints warnings before the read summary', () => {
    const path = join(directory, 'unnamed.svg');
    writeFileSync(path, '<svg><rect/><g id="g"><circle/></g></svg>', 'utf8');
    expect(cli.execute('read "' + path + '"')).toBe(
      'warning: assigned id rect1 to unnamed <rect>\n' +
      'warning: assigned id circle1 to unnamed <circle>\nread ' + path + ' (3 elements)',
    );
    expect(cli.execute('undo')).toBe('error: undo not allowed after io command');
    expect(cli.execute('redo')).toBe('error: undo not allowed after io command');
  });

  it('uses the last successful read or save path and clears it on init', () => {
    const first = join(directory, 'first.svg');
    const second = join(directory, 'second.svg');
    cli.execute('init');
    expect(cli.execute('save')).toBe("error: no file path. use 'save <file.svg>' first");
    cli.execute('save "' + first + '"');
    cli.execute('create g g');
    expect(cli.execute('save')).toBe('saved to ' + first + ' (1 elements)');
    cli.execute('save "' + second + '"');
    cli.execute('read "' + first + '"');
    cli.execute('create g h');
    cli.execute('save');
    expect(readFileSync(first, 'utf8')).toContain('id="h"');
    expect(readFileSync(second, 'utf8')).not.toContain('id="h"');
    cli.execute('init');
    expect(cli.execute('save')).toContain('no file path');
  });

  it('blocks history after save until a new edit, and makes the saved state the baseline', () => {
    const path = join(directory, 'history.svg');
    cli.execute('init');
    cli.execute('create g g');
    cli.execute('save "' + path + '"');
    expect(cli.execute('undo')).toBe('error: undo not allowed after io command');
    expect(cli.execute('redo')).toBe('error: undo not allowed after io command');
    cli.execute('create g h');
    cli.execute('undo');
    expect(cli.execute('tree')).toBe('svg (800x600)\n└── g#g');
    expect(cli.execute('undo')).toBe('error: nothing to undo');
  });

  it.each(['missing', 'malformed', 'duplicate', 'unsupported', 'nondecimal', 'invalidText', 'invalidRoot'])(
    'preserves the document, remembered path and redo on failed read: %s', kind => {
      const original = join(directory, 'original.svg');
      const invalid = join(directory, 'invalid.svg');
      const contents = new Map([
        ['malformed', '<svg><rect></svg>'],
        ['duplicate', '<svg><rect id="x"/><g id="x"/></svg>'],
        ['unsupported', '<svg><rect/><path/></svg>'],
        ['nondecimal', '<svg><rect x="0x10"/></svg>'],
        ['invalidText', '<svg><text id="t">&#0;</text></svg>'],
        ['invalidRoot', '<svg id="bad&#1;id"/>'],
      ]);
      if (contents.has(kind)) writeFileSync(invalid, contents.get(kind)!, 'utf8');
      cli.execute('init');
      cli.execute('create rect r 0 0 1 1');
      cli.execute('save "' + original + '"');
      cli.execute('move r 5 0');
      const moved = cli.execute('tree');
      cli.execute('undo');
      const before = cli.execute('tree');
      const result = cli.execute('read "' + invalid + '"')!;
      expect(result).toMatch(/^error:/u);
      expect(result).not.toContain('warning:');
      expect(cli.execute('tree')).toBe(before);
      cli.execute('redo');
      expect(cli.execute('tree')).toBe(moved);
      expect(cli.execute('save')).toContain('saved to ' + original);
    },
  );

  it('does not change the document, previous file or redo when a write fails', () => {
    const original = join(directory, 'original.svg');
    const blocked = join(directory, 'a-directory.svg');
    mkdirSync(blocked);
    cli.execute('init');
    cli.execute('create rect r 0 0 1 1');
    cli.execute('save "' + original + '"');
    const bytes = readFileSync(original, 'utf8');
    cli.execute('move r 1 0');
    const moved = cli.execute('tree');
    cli.execute('undo');
    expect(cli.execute('save "' + blocked + '"')).toBe('error: cannot write file: ' + blocked);
    expect(readFileSync(original, 'utf8')).toBe(bytes);
    expect(readdirSync(directory).some(name => name.endsWith('.tmp'))).toBe(false);
    cli.execute('redo');
    expect(cli.execute('tree')).toBe(moved);
    expect(cli.execute('save')).toContain('saved to ' + original);
  });

  it('reports nonexistent output parents without creating them', () => {
    cli.execute('init');
    const path = join(directory, 'missing', 'test.svg');
    expect(cli.execute('save "' + path + '"')).toBe('error: cannot write file: ' + path);
  });

  it('rejects non-XML edits before history changes, and leaves existing files untouched', () => {
    const path = join(directory, 'original.svg');
    writeFileSync(path, 'original bytes', 'utf8');
    cli.execute('init');
    cli.execute('create text t 0 0 "good"');
    expect(cli.execute('set t text "bad\u0000text"')).toBe('error: invalid XML character in document');
    expect(readFileSync(path, 'utf8')).toBe('original bytes');
    cli.execute('undo');
    expect(cli.execute('tree')).toBe('svg (800x600)');
  });

  it('requires a current document for save', () => {
    expect(cli.execute('save anything.svg')).toBe("error: no document. use 'init' or 'read' first");
  });
});
