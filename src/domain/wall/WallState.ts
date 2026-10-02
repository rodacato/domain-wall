import type { NoteId, NoteKind } from "./Note";

export type NoteEmphasis = "normal" | "highlighted" | "dimmed" | "rejected";

export interface WallNote {
  readonly id: NoteId;
  readonly emphasis: NoteEmphasis;
}

export interface WallArrow {
  readonly from: NoteId;
  readonly to: NoteId;
}

/** How the notes are arranged: one long timeline, or grouped into one region per bounded context. */
export type LayoutMode = "timeline" | "byContext";

/** Where the camera looks. The renderer turns a target into a viewport using the current layout. */
export type CameraTarget =
  | { readonly kind: "overview" }
  | { readonly kind: "layer"; readonly layer: NoteKind }
  | { readonly kind: "context"; readonly context: string }
  | { readonly kind: "notes"; readonly ids: readonly NoteId[] }
  /** The camera visits each stop in turn, so a long timeline can be read at a legible scale. */
  | { readonly kind: "tour"; readonly stops: readonly CameraTarget[] };

/** The floating note of the ambiguous term; its face depends on the context it currently sits in. */
export interface TermNoteState {
  readonly shown: boolean;
  /** The context whose meaning the note shows; null while it is still the neutral, ambiguous word. */
  readonly context: string | null;
}

/** Everything that can be seen on the wall at one moment. Pure data: animations derive from the difference between two states. */
export interface WallState {
  readonly notes: readonly WallNote[];
  readonly arrows: readonly WallArrow[];
  readonly boundaries: readonly string[];
  readonly layout: LayoutMode;
  readonly camera: CameraTarget;
  readonly term: TermNoteState;
}

export const EMPTY_WALL: WallState = {
  notes: [],
  arrows: [],
  boundaries: [],
  layout: "timeline",
  camera: { kind: "overview" },
  term: { shown: false, context: null },
};
