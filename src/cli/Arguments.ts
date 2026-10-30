import { EditorError } from '../domain/EditorError.js';
import { NumericValue } from '../domain/NumericValue.js';
import type { CommandToken } from './CommandToken.js';

export class Arguments {
  constructor(private readonly values: readonly CommandToken[], private readonly syntax: string) {}
  get all(): readonly string[] { return this.values.map(token => token.value); }
  get length(): number { return this.values.length; }
  isQuoted(index: number): boolean { return this.values.at(index)?.quoted ?? false; }
  failUsage(): never { throw new EditorError('usage: ' + this.syntax); }
  count(min: number, max = min): this {
    if (this.values.length < min || this.values.length > max) this.failUsage();
    return this;
  }
  text(index: number): string {
    const value = this.values[index];
    if (value === undefined) this.failUsage();
    return value.value;
  }
  number(index: number): number { return NumericValue.parse(this.text(index), 'parameter ' + (index + 1)); }
}
