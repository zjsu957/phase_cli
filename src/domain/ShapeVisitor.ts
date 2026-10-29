import type { Rect } from './Rect.js';
import type { Circle } from './Circle.js';
import type { Ellipse } from './Ellipse.js';
import type { Line } from './Line.js';
import type { Text } from './Text.js';
import type { Group } from './Group.js';

export interface ShapeVisitor<T> {
  visitRect(shape: Rect): T;
  visitCircle(shape: Circle): T;
  visitEllipse(shape: Ellipse): T;
  visitLine(shape: Line): T;
  visitText(shape: Text): T;
  visitGroup(shape: Group): T;
}
