import { EditorError } from '../domain/EditorError.js';

export class Tokenizer {
  tokenize(line: string): string[] {
    if (line.trimStart().startsWith('#')) return [];
    const tokens: string[] = [];
    let value = '';
    let quoted = false;
    let started = false;
    for (let index = 0; index < line.length; index++) {
      const character = line[index]!;
      if (character === '\\' && quoted && (line[index + 1] === '"' || line[index + 1] === '\\')) {
        value += line[++index]!;
        started = true;
      } else if (character === '"') {
        quoted = !quoted;
        started = true;
      } else if (/\s/u.test(character) && !quoted) {
        if (started) tokens.push(value);
        value = '';
        started = false;
      } else {
        value += character;
        started = true;
      }
    }
    if (quoted) throw new EditorError('unterminated double quote');
    if (started) tokens.push(value);
    return tokens;
  }
}
