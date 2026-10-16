import type { NoteId } from "./Note";
import type {
  ArrowStyle,
  CameraTarget,
  ContextPattern,
  ImpactModel,
  LayoutMode,
  NoteEmphasis,
} from "./WallState";

export interface ArrowSpec {
  readonly from: NoteId;
  readonly to: NoteId;
  readonly patterns?: readonly ContextPattern[];
  readonly style?: ArrowStyle;
}

/** The vocabulary scenes use to change the wall. Scenes are data made of these commands. */
export type WallCommand =
  | { readonly kind: "placeNotes"; readonly ids: readonly NoteId[] }
  | { readonly kind: "removeNotes"; readonly ids: readonly NoteId[] }
  | { readonly kind: "clearWall" }
  | { readonly kind: "setLayout"; readonly layout: LayoutMode }
  | { readonly kind: "drawBoundary"; readonly region: string }
  | { readonly kind: "eraseBoundaries" }
  | { readonly kind: "drawArrows"; readonly arrows: readonly ArrowSpec[] }
  | { readonly kind: "eraseArrows" }
  | { readonly kind: "emphasize"; readonly ids: readonly NoteId[]; readonly emphasis: NoteEmphasis }
  | { readonly kind: "clearEmphasis" }
  | { readonly kind: "focusCamera"; readonly target: CameraTarget }
  | { readonly kind: "showTerm"; readonly context: string | null }
  | { readonly kind: "hideTerm" }
  | { readonly kind: "addGlossaryEntries"; readonly concepts: readonly string[] }
  | { readonly kind: "flagAmbiguous"; readonly concept: string }
  | { readonly kind: "resolveAmbiguity"; readonly concept: string }
  | { readonly kind: "showImpact"; readonly model: ImpactModel; readonly revealed: number }
  | { readonly kind: "hideImpact" };
