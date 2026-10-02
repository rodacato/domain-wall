import { boundsOf } from "./layoutWall";
import type { WallLayout } from "./layoutWall";
import type { NoteId } from "./Note";
import type { Rectangle } from "./Placement";
import { termPlacement } from "./termPlacement";
import type { CameraTarget, WallState } from "./WallState";

export interface Viewport {
  /** Wall units to pixels. */
  readonly scale: number;
  /** Where the wall's origin sits, in pixels, inside the view. */
  readonly x: number;
  readonly y: number;
}

export interface ViewSize {
  readonly width: number;
  readonly height: number;
}

const FRAME_PADDING = 90;
const MINIMUM_SCALE = 0.12;
const MAXIMUM_SCALE = 1.15;
const EMPTY_WALL_FRAME: Rectangle = { x: 0, y: 0, width: 1600, height: 900 };

function kindOf(id: NoteId): string {
  return id.split(":")[0] ?? "";
}

/** The part of the wall (in wall units) that a camera target wants to see. */
export function frameOf(target: CameraTarget, state: WallState, layout: WallLayout): Rectangle {
  const placed = state.notes.flatMap((note) => {
    const placement = layout.placements.get(note.id);
    return placement === undefined ? [] : [{ id: note.id, placement }];
  });
  const overview = (): Rectangle => {
    const regions = state.boundaries.flatMap((context) => layout.regions.get(context) ?? []);
    const term = termPlacement(layout, state);
    const visible = [
      ...placed.map((entry) => entry.placement),
      ...regions,
      ...(term === null ? [] : [term]),
    ];
    return placed.length === 0 ? EMPTY_WALL_FRAME : boundsOf(visible);
  };

  switch (target.kind) {
    case "overview":
      return overview();
    case "layer": {
      const ofLayer = placed.filter((entry) => kindOf(entry.id) === target.layer);
      return ofLayer.length === 0 ? overview() : boundsOf(ofLayer.map((entry) => entry.placement));
    }
    case "context": {
      const region = layout.regions.get(target.context);
      return region ?? overview();
    }
    case "notes": {
      const wanted = new Set<string>(target.ids);
      const chosen = placed.filter((entry) => wanted.has(entry.id));
      return chosen.length === 0 ? overview() : boundsOf(chosen.map((entry) => entry.placement));
    }
    case "tour": {
      const last = target.stops[target.stops.length - 1];
      return last === undefined ? overview() : frameOf(last, state, layout);
    }
  }
}

/** The viewports the camera animates through: one for a plain target, one per stop for a tour. */
export function viewportsFor(
  target: CameraTarget,
  state: WallState,
  layout: WallLayout,
  view: ViewSize,
): readonly Viewport[] {
  const stops = target.kind === "tour" ? target.stops : [target];
  const targets = stops.length === 0 ? [{ kind: "overview" } as const] : stops;
  return targets.map((stop) => viewportFor(frameOf(stop, state, layout), view));
}

/** The transform that centres a frame in the view, as large as fits. */
export function viewportFor(frame: Rectangle, view: ViewSize): Viewport {
  const padded = {
    x: frame.x - FRAME_PADDING,
    y: frame.y - FRAME_PADDING,
    width: frame.width + FRAME_PADDING * 2,
    height: frame.height + FRAME_PADDING * 2,
  };
  const fit = Math.min(view.width / padded.width, view.height / padded.height);
  const scale = Math.min(MAXIMUM_SCALE, Math.max(MINIMUM_SCALE, fit));
  const centerX = padded.x + padded.width / 2;
  const centerY = padded.y + padded.height / 2;
  return { scale, x: view.width / 2 - centerX * scale, y: view.height / 2 - centerY * scale };
}
