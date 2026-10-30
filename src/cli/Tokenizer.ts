import { EditorError } from '../domain/EditorError.js';
import { CommandToken } from './CommandToken.js';

export class Tokenizer {
  tokenize(line: string): string[] {
    return this.scan(line).map(token => token.value);
  }
  scan(line: string): readonly CommandToken[] {
    if (line.trimStart().startsWith('#')) return [];
    const tokens: CommandToken[] = [];
    let value = '';
    let quoted = false;
    let started = false;
    let closedQuote = false;
    let wrappedInQuotes = false;
    for (let index = 0; index < line.length; index++) {
      const character = line[index]!;
      if (closedQuote && !/\s/u.test(character)) {
        throw new EditorError('quoted arguments must be separated by whitespace');
      }
      if (character === '\\' && quoted && (line[index + 1] === '"' || line[index + 1] === '\\')) {
        value += line[++index]!;
        started = true;
      } else if (character === '"') {
        if (!quoted && started) throw new EditorError('quoted arguments must be separated by whitespace');
        quoted = !quoted;
        closedQuote = !quoted;
        wrappedInQuotes = true;
        started = true;
      } else if (/\s/u.test(character) && !quoted) {
        if (started) tokens.push(new CommandToken(value, wrappedInQuotes));
        value = '';
        started = false;
        closedQuote = false;
        wrappedInQuotes = false;
      } else {
        value += character;
        started = true;
      }
    }
    if (quoted) throw new EditorError('unterminated double quote');
    if (started) tokens.push(new CommandToken(value, wrappedInQuotes));
    return tokens;
  }
}
