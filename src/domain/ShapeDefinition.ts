import { EditorError } from './EditorError.js';
import { NumericValue } from './NumericValue.js';
import type { Shape } from './Shape.js';

/** One definition supplies both CLI and SVG construction, without a second type switch. */
export class ShapeDefinition {
  constructor(
    private readonly geometry: readonly string[],
    private readonly build: (id: string, numbers: readonly number[], text: string) => Shape,
    private readonly optionalStyle?: string,
    private readonly takesText = false,
  ) {}

  syntax(type: string): string {
    return ['create', type, '<id>', ...this.geometry.map(name => '<' + name + '>'),
      ...(this.takesText ? ['"content"'] : []),
      ...(this.optionalStyle ? ['[' + this.optionalStyle + ']'] : []),
      '[in <containerId>]'].join(' ');
  }
  create(type: string, id: string, params: readonly string[]): Shape {
    const required = this.geometry.length + (this.takesText ? 1 : 0);
    if (params.length < required || params.length > required + (this.optionalStyle ? 1 : 0)) {
      throw new EditorError('usage: ' + this.syntax(type));
    }
    const numbers = this.geometry.map((name, index) => NumericValue.parse(params[index]!, name));
    const shape = this.build(id, numbers, this.takesText ? params[this.geometry.length]! : '');
    if (this.optionalStyle && params[required] !== undefined) shape.set(this.optionalStyle, params[required]!);
    return shape;
  }
  fromSvg(id: string, attributes: ReadonlyMap<string, string>, text: string): Shape {
    if (!this.takesText && text.trim()) throw new EditorError('unexpected text in shape: ' + id);
    const numbers = this.geometry.map(name => {
      const raw = attributes.get(name);
      return raw === undefined ? 0 : NumericValue.parse(raw.replace(/px$/u, ''), name);
    });
    const shape = this.build(id, numbers, this.takesText ? text : '');
    for (const [name, value] of attributes) {
      if (name !== 'id' && !this.geometry.includes(name)) shape.importPresentation(name, value);
    }
    return shape;
  }
}
