import { NumericValue } from './NumericValue.js';
import { Shape } from './Shape.js';

export abstract class GeometryShape extends Shape {
  private readonly geometry = new Map<string, number>();
  private readonly dimensions: ReadonlySet<string>;
  private readonly coordinatePairs: readonly (readonly [string, string])[];

  protected constructor(
    id: string,
    geometry: Readonly<Record<string, number>>,
    coordinatePairs: readonly (readonly [string, string])[],
    dimensions: readonly string[] = [],
  ) {
    super(id);
    this.dimensions = new Set(dimensions);
    this.coordinatePairs = coordinatePairs;
    for (const [name, value] of Object.entries(geometry)) this.write(name, value);
  }
  override get attributes(): ReadonlyMap<string, string> {
    return new Map([...this.geometry].map(([name, value]) => [name, String(value)] as const).concat([...super.attributes]));
  }
  protected number(name: string): number { return this.geometry.get(name)!; }
  private write(name: string, value: number): void {
    NumericValue.finite(value, name);
    if (this.dimensions.has(name)) NumericValue.nonnegative(value, name);
    this.geometry.set(name, Object.is(value, -0) ? 0 : value);
  }
  protected override setOwnAttribute(attr: string, value: string): boolean {
    if (!this.geometry.has(attr)) return false;
    this.write(attr, NumericValue.parse(value, attr));
    return true;
  }
  override move(dx: number, dy: number): void {
    NumericValue.finite(dx, 'dx');
    NumericValue.finite(dy, 'dy');
    const next = new Map(this.geometry);
    for (const [x, y] of this.coordinatePairs) {
      next.set(x, NumericValue.finite(this.number(x) + dx, x));
      next.set(y, NumericValue.finite(this.number(y) + dy, y));
    }
    for (const [name, value] of next) this.write(name, value);
  }
  override scale(factor: number): void {
    NumericValue.positive(factor, 'scale factor');
    const next = [...this.geometry].map(([name, value]) => [name, NumericValue.finite(value * factor, name)] as const);
    for (const [name, value] of next) this.write(name, value);
  }
}
