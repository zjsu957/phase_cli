import { EditorError } from './EditorError.js';
import { NumericValue } from './NumericValue.js';
import { XmlValue } from './XmlValue.js';

/** Presentation imported from SVG; CLI set keeps its smaller, lab-defined whitelist. */
export class SvgPresentation {
  private readonly values = new Map<string, string>();
  private readonly supported = new Set([
    'fill', 'stroke', 'stroke-width', 'transform', 'font-size', 'font-family',
    'font-weight', 'font-style', 'text-anchor', 'dominant-baseline',
    'opacity', 'fill-opacity', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin',
  ]);

  get attributes(): ReadonlyMap<string, string> { return new Map(this.values); }
  replace(attributes: ReadonlyMap<string, string>): void {
    const validated = new SvgPresentation();
    for (const [name, value] of attributes) validated.set(name, value);
    this.values.clear();
    for (const [name, value] of validated.attributes) this.values.set(name, value);
  }
  set(name: string, value: string): void {
    if (!this.supported.has(name) && !/^data-[a-zA-Z0-9_.-]+$/u.test(name)) {
      throw new EditorError('unsupported SVG attribute: ' + name);
    }
    if (!value.trim()) throw new EditorError(name + ' must not be empty');
    if (name === 'stroke-width') {
      value = String(NumericValue.nonnegative(NumericValue.parse(value.replace(/px$/u, ''), name), name));
    }
    this.values.set(name, XmlValue.validate(value));
  }
}
