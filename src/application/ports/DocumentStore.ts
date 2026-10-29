import type { LoadedDocument } from '../LoadedDocument.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export interface DocumentStore {
  read(path: string): LoadedDocument;
  save(path: string, document: SvgDocument): void;
}
