import { EditorError } from './EditorError.js';

export class NumericValue {
  static finite(value: number, name: string): number {
    if (!Number.isFinite(value)) throw new EditorError(name + ' must be a finite number');
    return Object.is(value, -0) ? 0 : value;
  }
  static parse(value: string, name: string): number {
    const decimal = value.trim();
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u.test(decimal)) {
      throw new EditorError(name + ' must be a finite number');
    }
    return this.finite(Number(decimal), name);
  }
  static nonnegative(value: number, name: string): number {
    this.finite(value, name);
    if (value < 0) throw new EditorError(name + ' must not be negative');
    return value;
  }
  static positive(value: number, name: string): number {
    this.finite(value, name);
    if (value <= 0) throw new EditorError(name + ' must be positive');
    return value;
  }
}
