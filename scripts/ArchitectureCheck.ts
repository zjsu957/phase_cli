import { parse } from '@babel/parser';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join, posix } from 'node:path';

/** Development-only AST checks; never imported by the editor runtime. */
export class ArchitectureCheck {
  private count = 0;
  get analyzedFiles(): number { return this.count; }

  checkProject(root: string): readonly string[] {
    const sources = new Map<string, string>();
    this.collect(root, 'src', sources);
    return this.checkSources(sources);
  }
  private collect(root: string, directory: string, sources: Map<string, string>): void {
    for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
      const path = posix.join(directory, entry.name);
      if (entry.isDirectory()) this.collect(root, path, sources);
      else if (entry.isFile() && entry.name.endsWith('.ts')) sources.set(path, readFileSync(join(root, path), 'utf8'));
    }
  }
  checkSources(input: ReadonlyMap<string, string>): readonly string[] {
    const sources = new Map([...input].map(([file, source]) => [file.replace(/\\/gu, '/'), source]));
    const errors: string[] = [];
    const graph = new Map<string, string[]>();
    this.count = sources.size;
    for (const [file, source] of sources) {
      graph.set(file, []);
      let ast;
      try { ast = parse(source, { sourceType: 'module', plugins: ['typescript'], createImportExpressions: true }); }
      catch { errors.push(file + ': cannot parse TypeScript'); continue; }
      const classes: string[] = [];
      for (const statement of ast.program.body) {
        const declaration = statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration'
          ? statement.declaration : statement;
        if (declaration?.type === 'ClassDeclaration') classes.push(declaration.id?.name ?? '(anonymous)');
        if (statement.type === 'ImportDeclaration') {
          const typeOnly = statement.importKind === 'type' || (statement.specifiers.length > 0 &&
            statement.specifiers.every(specifier => specifier.type === 'ImportSpecifier' && specifier.importKind === 'type'));
          this.reference(file, statement.source.value, typeOnly, sources, graph, errors);
        } else if ((statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportAllDeclaration') && statement.source) {
          const typeOnly = statement.exportKind === 'type';
          this.reference(file, statement.source.value, typeOnly, sources, graph, errors);
        }
      }
      if (classes.length > 1 || (classes.length === 1 && classes[0] !== basename(file, '.ts'))) {
        errors.push(file + ': each class must be in its own same-named file');
      }
      this.walk(ast.program, file, errors);
    }
    this.cycles(graph, errors);
    return errors;
  }
  private reference(
    file: string, specifier: string, typeOnly: boolean, sources: ReadonlyMap<string, string>,
    graph: Map<string, string[]>, errors: string[],
  ): void {
    if (!specifier.startsWith('.')) {
      const allowedNode = specifier.startsWith('node:') &&
        (file.startsWith('src/infrastructure/files/') ||
          (file === 'src/cli/Repl.ts' && ['node:readline', 'node:stream'].includes(specifier)) ||
          (file === 'src/main.ts' && specifier === 'node:process'));
      const allowedXml = specifier === '@xmldom/xmldom' && file.startsWith('src/infrastructure/svg/');
      if (!allowedNode && !allowedXml) errors.push(file + ': forbidden external dependency ' + specifier);
      return;
    }
    const target = posix.normalize(posix.join(posix.dirname(file), specifier)).replace(/\.js$/u, '.ts');
    if (!sources.has(target)) { errors.push(file + ': unresolved local dependency ' + specifier); return; }
    if (!this.allowed(file, target)) errors.push(file + ': forbidden dependency -> ' + target);
    if (!typeOnly) graph.get(file)!.push(target);
  }
  private allowed(file: string, target: string): boolean {
    if (file === 'src/main.ts') return true;
    if (file.startsWith('src/domain/')) return target.startsWith('src/domain/');
    if (file.startsWith('src/application/')) {
      return target.startsWith('src/application/') || target.startsWith('src/domain/');
    }
    if (file.startsWith('src/cli/')) {
      return target.startsWith('src/cli/') || target.startsWith('src/application/') ||
        ['src/domain/EditorError.ts', 'src/domain/NumericValue.ts'].includes(target);
    }
    if (file.startsWith('src/infrastructure/')) {
      return target.startsWith('src/infrastructure/') || target.startsWith('src/domain/') ||
        target.startsWith('src/application/ports/') || target === 'src/application/LoadedDocument.ts';
    }
    return false;
  }
  private walk(value: unknown, file: string, errors: string[]): void {
    if (Array.isArray(value)) { for (const child of value) this.walk(child, file, errors); return; }
    if (!value || typeof value !== 'object') return;
    const node = value as Record<string, unknown>;
    if (node.type === 'ImportExpression' || node.type === 'TSImportEqualsDeclaration' || (node.type === 'CallExpression' &&
      this.node(node.callee).name === 'require')) {
      errors.push(file + ': dynamic module loading is outside the documented dependency graph');
    }
    if ((node.type === 'ClassProperty' || node.type === 'ClassAccessorProperty' ||
      node.type === 'TSParameterProperty') && !['private', 'protected'].includes(String(node.accessibility))) {
      errors.push(file + ': fields must be private or protected');
    }
    if (node.type === 'BinaryExpression' && ['===', '!==', '==', '!='].includes(String(node.operator)) &&
      [node.left, node.right].some(part => this.isTag(part))) {
      errors.push(file + ': use shape polymorphism instead of comparing tag');
    }
    if (node.type === 'SwitchStatement' && this.isTag(node.discriminant)) {
      errors.push(file + ': use shape polymorphism instead of switch(tag)');
    }
    for (const [key, child] of Object.entries(node)) {
      if (!['loc', 'start', 'end', 'comments', 'leadingComments', 'trailingComments'].includes(key)) this.walk(child, file, errors);
    }
  }
  private node(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? value as Record<string, unknown> : {};
  }
  private isTag(value: unknown): boolean {
    const node = this.node(value);
    const property = this.node(node.property);
    return (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') &&
      (property.name === 'tag' || property.value === 'tag');
  }
  private cycles(graph: ReadonlyMap<string, readonly string[]>, errors: string[]): void {
    const complete = new Set<string>();
    const path: string[] = [];
    const visit = (file: string): void => {
      const cycle = path.indexOf(file);
      if (cycle >= 0) { errors.push('runtime dependency cycle: ' + [...path.slice(cycle), file].join(' -> ')); return; }
      if (complete.has(file)) return;
      path.push(file);
      for (const target of graph.get(file) ?? []) visit(target);
      path.pop();
      complete.add(file);
    };
    for (const file of graph.keys()) visit(file);
  }
}
