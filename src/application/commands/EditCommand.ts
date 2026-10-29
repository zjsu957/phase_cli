import type { SvgDocument } from '../../domain/SvgDocument.js';

export interface EditCommand {
  execute(document: SvgDocument): string;
  undo(document: SvgDocument): string;
  redo(document: SvgDocument): string;
}
