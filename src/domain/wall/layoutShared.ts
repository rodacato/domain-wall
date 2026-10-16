import type { NoteId, NoteKind } from "./Note";
import type { Placement, Rectangle } from "./Placement";

export const NOTE_SIZE: Readonly<
  Record<NoteKind, { readonly width: number; readonly height: number }>
> = {
  event: { width: 128, height: 96 },
  command: { width: 128, height: 96 },
  actor: { width: 112, height: 72 },
  policy: { width: 128, height: 96 },
  externalSystem: { width: 128, height: 96 },
  readModel: { width: 128, height: 96 },
  aggregate: { width: 240, height: 120 },
  context: { width: 260, height: 130 },
};

export interface WallLayout {
  readonly placements: ReadonlyMap<NoteId, Placement>;
  /** Named areas with a hand-drawn border: one per context when grouped, one per zone in the subdomain chart. */
  readonly regions: ReadonlyMap<string, Rectangle>;
}

/** A small deterministic tilt in [-3, 3] degrees derived from the note's id. */
export function tiltOf(id: string): number {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) % 997;
  return (hash % 7) - 3;
}

export function boundsOf(rectangles: readonly Rectangle[]): Rectangle {
  if (rectangles.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const left = Math.min(...rectangles.map((rectangle) => rectangle.x));
  const top = Math.min(...rectangles.map((rectangle) => rectangle.y));
  const right = Math.max(...rectangles.map((rectangle) => rectangle.x + rectangle.width));
  const bottom = Math.max(...rectangles.map((rectangle) => rectangle.y + rectangle.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function centeredPlacement(
  id: NoteId,
  kind: NoteKind,
  centerX: number,
  centerY: number,
): Placement {
  const size = NOTE_SIZE[kind];
  return {
    x: centerX - size.width / 2,
    y: centerY - size.height / 2,
    ...size,
    rotation: tiltOf(id),
  };
}
