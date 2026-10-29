import { EditorError } from '../domain/EditorError.js';
import { NumericValue } from '../domain/NumericValue.js';

export class Arguments {
  constructor(private readonly values: readonly string[], private readonly syntax: string) {}
  count(min: number, max = min): this {
    if (this.values.length < min || this.values.length > max) throw new EditorError('usage: ' + this.syntax);
    return this;
  }
  text(index: number): string {
    const value = this.values[index];
    if (value === undefined) throw new EditorError('usage: ' + this.syntax);
    return value;
  }
  number(index: number): number { return NumericValue.parse(this.text(index), 'parameter ' + (index + 1)); }
}
