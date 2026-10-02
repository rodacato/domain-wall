import type { WallLayout } from "./layoutWall";
import { boundsOf } from "./layoutWall";
import type { Rectangle } from "./Placement";
import type { WallState } from "./WallState";

export const TERM_NOTE_SIZE = { width: 340, height: 200 } as const;

/** Where the floating term note sits: in the header of its context, or above the wall while it is still ambiguous. */
export function termPlacement(layout: WallLayout, state: WallState): Rectangle | null {
  if (!state.term.shown) return null;
  const region = state.term.context === null ? undefined : layout.regions.get(state.term.context);
  if (region !== undefined) {
    return {
      x: region.x + region.width - TERM_NOTE_SIZE.width - 30,
      y: region.y + 20,
      ...TERM_NOTE_SIZE,
    };
  }
  const wall = boundsOf([...layout.placements.values(), ...layout.regions.values()]);
  return { x: wall.x + 20, y: wall.y - TERM_NOTE_SIZE.height - 40, ...TERM_NOTE_SIZE };
}
