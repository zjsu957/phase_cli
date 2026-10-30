import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ArchitectureCheck } from '../scripts/ArchitectureCheck.js';

describe('executable architecture rules', () => {
  it('validates the real production dependency graph and class encapsulation', () => {
    const checker = new ArchitectureCheck();
    expect(checker.checkProject(fileURLToPath(new URL('../', import.meta.url)))).toEqual([]);
    expect(checker.analyzedFiles).toBeGreaterThan(30);
  });

  it.each([
    ['src/domain/Rect.ts', 'import { Editor } from "../application/Editor.js"; export class Rect {}',
      'forbidden dependency'],
    ['src/application/Editor.ts', 'import { NodeDocumentStore } from "../infrastructure/files/NodeDocumentStore.js"; export class Editor {}',
      'forbidden dependency'],
    ['src/cli/CommandRouter.ts', 'import { Rect } from "../domain/Rect.js"; export class CommandRouter {}',
      'forbidden dependency'],
    ['src/infrastructure/svg/SvgParser.ts', 'import { Editor } from "../../application/Editor.js"; export class SvgParser {}',
      'forbidden dependency'],
    ['src/domain/Rect.ts', 'import { readFileSync } from "node:fs"; export class Rect {}',
      'forbidden external dependency'],
    ['src/cli/CommandRouter.ts', 'import { DOMParser } from "@xmldom/xmldom"; export class CommandRouter {}',
      'forbidden external dependency'],
    ['src/domain/Rect.ts', 'export class Rect {} export class Circle {}', 'same-named file'],
    ['src/domain/Rect.ts', 'export class WrongName {}', 'same-named file'],
    ['src/domain/Rect.ts', 'export class Rect { x = 0; }', 'fields must be private'],
    ['src/domain/Rect.ts', 'export class Rect { constructor(public x: number) {} }', 'fields must be private'],
    ['src/application/Editor.ts', 'export class Editor { test(s: any) { return s.tag === "rect"; } }', 'shape polymorphism'],
    ['src/application/Editor.ts', 'export class Editor { test(s: any) { switch(s["tag"]) { default: break; } } }', 'shape polymorphism'],
    ['src/domain/Rect.ts', 'export class Rect { test() { return import("./Circle.js"); } }', 'dynamic module loading'],
    ['src/domain/Rect.ts', 'const fs = require("node:fs"); export class Rect {}', 'dynamic module loading'],
    ['src/domain/Rect.ts', 'import fs = require("node:fs"); export class Rect {}', 'dynamic module loading'],
    ['src/domain/Rect.ts', 'export { Missing } from "./Missing.js"; export class Rect {}', 'unresolved local dependency'],
  ])('detects violations without modifying the project: %s (%s)', (file, source, message) => {
    const sources = new Map([
      ['src/domain/Rect.ts', 'export class Rect {}'],
      ['src/application/Editor.ts', 'export class Editor {}'],
      ['src/infrastructure/files/NodeDocumentStore.ts', 'export class NodeDocumentStore {}'],
      [file, source],
    ]);
    expect(new ArchitectureCheck().checkSources(sources).join('\n')).toContain(message);
  });

  it('allows type-reference cycles while rejecting runtime import cycles', () => {
    const typeOnly = new Map([
      ['src/domain/Rect.ts', 'import type { Circle } from "./Circle.js"; export class Rect {}'],
      ['src/domain/Circle.ts', 'import { type Rect } from "./Rect.js"; export class Circle {}'],
    ]);
    expect(new ArchitectureCheck().checkSources(typeOnly)).toEqual([]);
    const runtime = new Map([...typeOnly].map(([file, source]) => [file, source.replace('import type {', 'import {').replace('{ type Rect', '{ Rect')]));
    expect(new ArchitectureCheck().checkSources(runtime).join('\n')).toContain('runtime dependency cycle');
  });

  it('ignores import-like strings and comments, but checks type-only layer violations', () => {
    const sources = new Map([
      ['src/domain/Rect.ts', '// import { Editor } from "../application/Editor.js";\nexport class Rect { private message = \'s.tag === "rect"\'; label(s: any) { return s.tag + "#"; } }'],
      ['src/application/Editor.ts', 'export class Editor {}'],
    ]);
    expect(new ArchitectureCheck().checkSources(sources)).toEqual([]);
    sources.set('src/domain/Rect.ts', 'import type { Editor } from "../application/Editor.js"; export class Rect {}');
    expect(new ArchitectureCheck().checkSources(sources).join('\n')).toContain('forbidden dependency');
  });
});
