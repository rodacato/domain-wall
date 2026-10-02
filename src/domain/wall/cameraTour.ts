import type { PackIndex } from "../pack/PackIndex";
import { layoutWall } from "./layoutWall";
import { listAllNotes, type NoteId, type NoteKind } from "./Note";
import type { CameraTarget } from "./WallState";

const EVENTS_PER_SEGMENT = 6;

interface Segment {
  readonly left: number;
  readonly right: number;
}

/** Horizontal ranges of the timeline, each covering a few events, so the camera can read it piece by piece. */
export function timelineSegments(
  index: PackIndex,
  eventsPerSegment = EVENTS_PER_SEGMENT,
): readonly Segment[] {
  const { placements } = layoutWall(index, "timeline");
  const eventRectangles = listAllNotes(index)
    .filter((note) => note.kind === "event")
    .flatMap((note) => {
      const placement = placements.get(note.id);
      return placement === undefined ? [] : [placement];
    })
    .sort((a, b) => a.x - b.x);

  const segments: Segment[] = [];
  for (let start = 0; start < eventRectangles.length; start += eventsPerSegment) {
    const chunk = eventRectangles.slice(start, start + eventsPerSegment);
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    if (first === undefined || last === undefined) continue;
    segments.push({ left: first.x - 90, right: last.x + last.width + 90 });
  }
  return segments;
}

/**
 * A camera tour over one layer of the timeline: it stops at each segment that has notes of the
 * layer, at a scale where the notes can be read, and rests on the last one.
 */
export function cameraTourOfLayer(index: PackIndex, layer: NoteKind): CameraTarget {
  const { placements } = layoutWall(index, "timeline");
  const layerNotes = listAllNotes(index).filter((note) => note.kind === layer);
  const stops: CameraTarget[] = [];

  for (const segment of timelineSegments(index)) {
    const ids: NoteId[] = layerNotes
      .filter((note) => {
        const placement = placements.get(note.id);
        if (placement === undefined) return false;
        const center = placement.x + placement.width / 2;
        return center >= segment.left && center <= segment.right;
      })
      .map((note) => note.id);
    if (ids.length > 0) stops.push({ kind: "notes", ids });
  }
  return stops.length <= 1 ? { kind: "layer", layer } : { kind: "tour", stops };
}
