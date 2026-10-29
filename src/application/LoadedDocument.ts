import type { SvgDocument } from '../domain/SvgDocument.js';

export class LoadedDocument {
  private readonly snapshot: SvgDocument;
  private readonly messages: readonly string[];
  constructor(document: SvgDocument, warnings: readonly string[]) {
    this.snapshot = document.clone();
    this.messages = [...warnings];
  }
  get document(): SvgDocument { return this.snapshot.clone(); }
  get warnings(): readonly string[] { return [...this.messages]; }
}
