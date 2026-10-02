import type { Rectangle } from "../../domain/wall/Placement";

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Small deterministic random generator (mulberry32) seeded from text, so every recording draws the same wall. */
export function seededRandom(seedText: string): () => number {
  let hash = 1779033703;
  for (const character of seedText) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  let state = hash >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/** A closed, slightly wobbly outline of a rectangle, as an SVG path of smooth curves. */
export function wobblyClosedPath(rectangle: Rectangle, seed: string, wobble = 6): string {
  const random = seededRandom(seed);
  const step = 70;
  const points: Point[] = [];
  const jitter = (): number => (random() - 0.5) * 2 * wobble;
  const across = Math.max(1, Math.round(rectangle.width / step));
  const down = Math.max(1, Math.round(rectangle.height / step));
  for (let i = 0; i < across; i += 1)
    points.push({
      x: rectangle.x + (rectangle.width * i) / across + jitter(),
      y: rectangle.y + jitter(),
    });
  for (let i = 0; i < down; i += 1)
    points.push({
      x: rectangle.x + rectangle.width + jitter(),
      y: rectangle.y + (rectangle.height * i) / down + jitter(),
    });
  for (let i = 0; i < across; i += 1)
    points.push({
      x: rectangle.x + rectangle.width - (rectangle.width * i) / across + jitter(),
      y: rectangle.y + rectangle.height + jitter(),
    });
  for (let i = 0; i < down; i += 1)
    points.push({
      x: rectangle.x + jitter(),
      y: rectangle.y + rectangle.height - (rectangle.height * i) / down + jitter(),
    });

  const at = (position: number): Point =>
    points[((position % points.length) + points.length) % points.length] ?? { x: 0, y: 0 };
  const first = at(0);
  const segments = points.map((_, position) => {
    const before = at(position - 1);
    const from = at(position);
    const to = at(position + 1);
    const after = at(position + 2);
    const control1 = { x: from.x + (to.x - before.x) / 6, y: from.y + (to.y - before.y) / 6 };
    const control2 = { x: to.x - (after.x - from.x) / 6, y: to.y - (after.y - from.y) / 6 };
    return `C ${round(control1.x)} ${round(control1.y)} ${round(control2.x)} ${round(control2.y)} ${round(to.x)} ${round(to.y)}`;
  });
  return `M ${round(first.x)} ${round(first.y)} ${segments.join(" ")} Z`;
}

/** Where the straight line from the rectangle's centre toward a point leaves the rectangle. */
export function edgePoint(rectangle: Rectangle, toward: Point): Point {
  const center = { x: rectangle.x + rectangle.width / 2, y: rectangle.y + rectangle.height / 2 };
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (dx === 0 && dy === 0) return center;
  const scale = Math.min(
    dx === 0 ? Infinity : rectangle.width / 2 / Math.abs(dx),
    dy === 0 ? Infinity : rectangle.height / 2 / Math.abs(dy),
  );
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

export interface ArrowPaths {
  readonly shaft: string;
  readonly head: string;
}

/** A hand-drawn curved arrow from one rectangle to another, with a two-stroke arrowhead. */
export function arrowBetween(from: Rectangle, to: Rectangle, seed: string): ArrowPaths {
  const random = seededRandom(seed);
  const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const toCenter = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
  const start = edgePoint(from, toCenter);
  const end = edgePoint(to, fromCenter);
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  const bend = (random() > 0.5 ? 1 : -1) * Math.min(60, length * 0.14);
  const middle = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const normal =
    length === 0
      ? { x: 0, y: 0 }
      : { x: -(end.y - start.y) / length, y: (end.x - start.x) / length };
  const control = { x: middle.x + normal.x * bend, y: middle.y + normal.y * bend };

  const tangent = Math.atan2(end.y - control.y, end.x - control.x);
  const headLength = 14;
  const wing = (offset: number): Point => ({
    x: end.x - headLength * Math.cos(tangent + offset),
    y: end.y - headLength * Math.sin(tangent + offset),
  });
  const left = wing(0.45);
  const right = wing(-0.45);
  return {
    shaft: `M ${round(start.x)} ${round(start.y)} Q ${round(control.x)} ${round(control.y)} ${round(end.x)} ${round(end.y)}`,
    head: `M ${round(left.x)} ${round(left.y)} L ${round(end.x)} ${round(end.y)} L ${round(right.x)} ${round(right.y)}`,
  };
}
