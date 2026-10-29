import { describe, expect, it } from 'vitest';
import { Tokenizer } from '../src/cli/Tokenizer.js';

describe('Tokenizer', () => {
  const tokenizer = new Tokenizer();
  it('keeps quoted content, empty text, Chinese and color literals', () => {
    expect(tokenizer.tokenize('set t text "开始 process"')).toEqual(['set', 't', 'text', '开始 process']);
    expect(tokenizer.tokenize('create text t 0 0 ""')).toEqual(['create', 'text', 't', '0', '0', '']);
    expect(tokenizer.tokenize('set r fill #ffffff')).toEqual(['set', 'r', 'fill', '#ffffff']);
  });
  it('supports escaped quotes and backslashes inside quotes', () => {
    expect(tokenizer.tokenize('set t text "say \\"hi\\" at C:\\\\temp"'))
      .toEqual(['set', 't', 'text', 'say "hi" at C:\\temp']);
  });
  it('skips blank and comment lines, and rejects an unmatched quote', () => {
    expect(tokenizer.tokenize(' \t ')).toEqual([]);
    expect(tokenizer.tokenize('  # comment')).toEqual([]);
    expect(() => tokenizer.tokenize('set t text "unfinished')).toThrow('unterminated double quote');
  });
});
