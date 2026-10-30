/** Preserve quoting so literal "in" is distinguishable from the parent-clause keyword. */
export class CommandToken {
  constructor(private readonly content: string, private readonly wrappedInQuotes: boolean) {}
  get value(): string { return this.content; }
  get quoted(): boolean { return this.wrappedInQuotes; }
}
