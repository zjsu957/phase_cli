import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Native Node TypeScript stripping keeps this check runnable without development dependencies. */
class RuntimeSmokeCheck {
  private readonly root = fileURLToPath(new URL('../', import.meta.url));

  run(): void {
    const directory = mkdtempSync(join(tmpdir(), 'svg-release-'));
    try {
      const flow = this.execute(directory, readFileSync(join(this.root, 'examples/flowchart.txt'), 'utf8'));
      assert.deepEqual(this.errors(flow), ['error: undo not allowed after io command']);
      assert.ok(flow.includes('saved to flowchart.svg (8 elements)'));
      assert.ok(flow.includes('read flowchart.svg (8 elements)'));
      const svg = readFileSync(join(directory, 'flowchart.svg'), 'utf8');
      assert.ok(svg.includes('处理数据 v2'));
      assert.ok(svg.includes('<text id="start-label" x="155" y="135">开始</text>'));
      copyFileSync(join(this.root, 'examples/other.svg'), join(directory, 'other.svg'));
      const output = this.execute(directory, [
        'read other.svg', 'canvas 640', 'canvas', 'set c1 fill red', 'move c1 5 0',
        'undo', 'redo', 'save "中文 diagram.svg"', 'init', 'read "中文 diagram.svg"', 'show c1',
      ].join('\n'));
      assert.deepEqual(this.errors(output), []);
      assert.ok(output.includes('warning: assigned id rect1 to unnamed <rect>'));
      assert.ok(output.includes('canvas resized to 640x300'));
      assert.ok(output.includes('canvas 640x300'));
      assert.ok(output.includes('cx=55'));
      assert.ok(output.includes('fill=red'));
      assert.ok(readFileSync(join(directory, '中文 diagram.svg'), 'utf8').includes('width="640" height="300"'));
      console.log('Compiled CLI smoke checks passed: flowchart, import, canvas, undo/redo and UTF-8 paths.');
    } finally {
      const target = resolve(directory);
      if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith('svg-release-')) {
        throw new Error('Refusing to remove an unexpected release check directory');
      }
      rmSync(target, { recursive: true, force: true });
    }
  }
  private execute(directory: string, commands: string): string {
    const result = spawnSync(process.execPath, [join(this.root, 'dist/main.js')], {
      cwd: directory, input: commands, encoding: 'utf8', timeout: 20000,
    });
    assert.ifError(result.error);
    assert.equal(result.signal, null);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.doesNotMatch(result.stdout, /^svg> /mu);
    return result.stdout;
  }
  private errors(output: string): string[] {
    return output.split(/\r?\n/u).filter(line => line.startsWith('error:'));
  }
}

new RuntimeSmokeCheck().run();
