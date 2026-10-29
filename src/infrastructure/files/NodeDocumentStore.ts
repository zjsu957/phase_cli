import { randomUUID } from 'node:crypto';
import { closeSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import type { LoadedDocument } from '../../application/LoadedDocument.js';
import type { DocumentStore } from '../../application/ports/DocumentStore.js';
import { EditorError } from '../../domain/EditorError.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { SvgParser } from '../svg/SvgParser.js';
import { SvgSerializer } from '../svg/SvgSerializer.js';

export class NodeDocumentStore implements DocumentStore {
  read(path: string): LoadedDocument {
    let source: string;
    try { source = readFileSync(path, 'utf8'); }
    catch { throw new EditorError('cannot read file: ' + path); }
    return new SvgParser().parse(source);
  }
  save(path: string, document: SvgDocument): void {
    const source = new SvgSerializer().serialize(document);
    const destination = resolve(path);
    const temporary = join(dirname(destination), '.' + basename(destination) + '.' + randomUUID() + '.tmp');
    let created = false;
    try {
      const descriptor = openSync(temporary, 'wx');
      created = true;
      try { writeFileSync(descriptor, source, 'utf8'); }
      finally { closeSync(descriptor); }
      renameSync(temporary, destination);
      created = false;
    } catch {
      throw new EditorError('cannot write file: ' + path);
    } finally {
      if (created) {
        try { unlinkSync(temporary); } catch { /* Keep the original write error if cleanup also fails. */ }
      }
    }
  }
}
