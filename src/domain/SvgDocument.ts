import { EditorError } from './EditorError.js';
import { Group } from './Group.js';
import { NumericValue } from './NumericValue.js';
import type { Shape } from './Shape.js';

export class SvgDocument {
  private canvasWidth: number;
  private canvasHeight: number;
  private roots: Shape[] = [];

  constructor(width = 800, height = 600) {
    this.canvasWidth = NumericValue.positive(width, 'canvas width');
    this.canvasHeight = NumericValue.positive(height, 'canvas height');
  }
  get width(): number { return this.canvasWidth; }
  get height(): number { return this.canvasHeight; }
  get children(): readonly Shape[] { return [...this.roots]; }

  resize(width: number, height: number): void {
    NumericValue.positive(width, 'canvas width');
    NumericValue.positive(height, 'canvas height');
    this.canvasWidth = width;
    this.canvasHeight = height;
  }
  private findOptional(id: string): Shape | undefined {
    for (const shape of this.roots) {
      const result = shape.find(id);
      if (result) return result;
    }
    return undefined;
  }
  find(id: string): Shape {
    const shape = this.findOptional(id);
    if (!shape) throw new EditorError('no such shape: ' + id);
    return shape;
  }
  container(id: string): Group {
    const shape = this.findOptional(id);
    if (!shape) throw new EditorError('no such container: ' + id);
    return shape.asContainer();
  }
  parentOf(id: string): Group | undefined {
    this.find(id);
    for (const shape of this.roots) {
      const parent = shape.findParent(id);
      if (parent) return parent;
    }
    return undefined;
  }
  private ensureNewId(id: string): void {
    if (this.findOptional(id)) throw new EditorError('id already exists: ' + id);
  }
  add(shape: Shape, parentId?: string): void {
    for (const node of this.flatten([shape])) this.ensureNewId(node.id);
    if (parentId === undefined) this.roots.push(shape);
    else this.container(parentId).insert(shape);
  }
  delete(id: string): Shape {
    const shape = this.find(id);
    this.detach(shape);
    return shape;
  }
  private detach(shape: Shape): number {
    const parent = this.parentOf(shape.id);
    if (parent) return parent.remove(shape);
    const index = this.roots.indexOf(shape);
    this.roots.splice(index, 1);
    return index;
  }
  private insert(shape: Shape, parent: Group | undefined, index: number): void {
    if (parent) parent.insert(shape, index);
    else this.roots.splice(index, 0, shape);
  }
  private flatten(shapes: readonly Shape[]): Shape[] {
    return shapes.flatMap(shape => [shape, ...this.flatten(shape.children)]);
  }
  group(id: string, selectedIds: readonly string[]): Group {
    this.ensureNewId(id);
    if (selectedIds.length === 0) throw new EditorError('group requires at least one shape');
    if (new Set(selectedIds).size !== selectedIds.length) throw new EditorError('duplicate group member');
    const selected = selectedIds.map(selectedId => this.find(selectedId));
    for (const ancestor of selected) {
      if (selected.some(other => other !== ancestor && ancestor.find(other.id))) {
        throw new EditorError('cannot group a container into its own descendant: ' + ancestor.id);
      }
    }
    const ordered = this.flatten(this.roots).filter(shape => selected.includes(shape));
    const parents = ordered.map(shape => this.parentOf(shape.id));
    const commonParent = parents.every(parent => parent === parents[0]) ? parents[0] : undefined;
    const siblings = commonParent?.children ?? this.roots;
    const position = siblings.findIndex(shape => ordered.some(member => shape.find(member.id)));
    const group = new Group(id);
    for (const shape of ordered) {
      this.detach(shape);
      group.insert(shape);
    }
    this.insert(group, commonParent, position);
    return group;
  }
  ungroup(id: string): number {
    const group = this.find(id).asContainer();
    const parent = this.parentOf(id);
    if (!parent) throw new EditorError('cannot ungroup top-level container: ' + id);
    const position = parent.remove(group);
    const children = group.children;
    for (const [offset, child] of children.entries()) {
      group.remove(child);
      parent.insert(child, position + offset);
    }
    return children.length;
  }
  addTo(groupId: string, id: string): void {
    const group = this.container(groupId);
    const shape = this.find(id);
    if (shape.find(groupId)) throw new EditorError('cannot move a container into its own descendant: ' + id);
    this.detach(shape);
    group.insert(shape);
  }
  front(id: string): void {
    const shape = this.find(id);
    const parent = this.parentOf(id);
    this.detach(shape);
    this.insert(shape, parent, (parent?.children ?? this.roots).length);
  }
  back(id: string): void {
    const shape = this.find(id);
    const parent = this.parentOf(id);
    this.detach(shape);
    this.insert(shape, parent, 0);
  }
  clone(): SvgDocument {
    const result = new SvgDocument(this.width, this.height);
    result.roots = this.roots.map(shape => shape.clone());
    return result;
  }
  restore(snapshot: SvgDocument): void {
    const copy = snapshot.clone();
    this.canvasWidth = copy.width;
    this.canvasHeight = copy.height;
    this.roots = copy.roots;
  }
}
