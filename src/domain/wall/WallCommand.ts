import type { NoteId } from "./Note";
import type { CameraTarget, LayoutMode, NoteEmphasis } from "./WallState";

/** The vocabulary scenes use to change the wall. Scenes are data made of these commands. */
export type WallCommand =
  | { readonly kind: "placeNotes"; readonly ids: readonly NoteId[] }
  | { readonly kind: "removeNotes"; readonly ids: readonly NoteId[] }
  | { readonly kind: "clearWall" }
  | { readonly kind: "setLayout"; readonly layout: LayoutMode }
  | { readonly kind: "drawBoundary"; readonly context: string }
  | { readonly kind: "eraseBoundaries" }
  | {
      readonly kind: "drawArrows";
      readonly arrows: readonly { readonly from: NoteId; readonly to: NoteId }[];
    }
  | { readonly kind: "eraseArrows" }
  | { readonly kind: "emphasize"; readonly ids: readonly NoteId[]; readonly emphasis: NoteEmphasis }
  | { readonly kind: "clearEmphasis" }
  | { readonly kind: "focusCamera"; readonly target: CameraTarget }
  | { readonly kind: "showTerm"; readonly context: string | null }
  | { readonly kind: "hideTerm" };
