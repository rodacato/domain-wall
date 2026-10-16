import { HIDDEN_ARCHITECTURE, type ArchitectureStageState } from "./ArchitectureStage";
import { HIDDEN_CODE_STAGE, type CodeStageState } from "./CodeStage";
import { NO_EXERCISE, type ExerciseStageState } from "./ExerciseStage";
import { HIDDEN_PIPELINE, type PipelineStageState } from "./PipelineStage";
import type { LayoutMode } from "./LayoutMode";
import type { NoteId, NoteKind } from "./Note";

export type NoteEmphasis = "normal" | "highlighted" | "dimmed" | "rejected";

export interface WallNote {
  readonly id: NoteId;
  readonly emphasis: NoteEmphasis;
}

import type { ContextPattern } from "../pack/schema/Strategy";

export { CONTEXT_PATTERNS, type ContextPattern } from "../pack/schema/Strategy";

/** How an arrow is drawn: a plain flow, a two-way bond, a severed link, or a flow guarded by a translation layer. */
export type ArrowStyle = "plain" | "mutual" | "severed" | "shielded";

export interface WallArrow {
  readonly from: NoteId;
  readonly to: NoteId;
  readonly patterns: readonly ContextPattern[];
  readonly style: ArrowStyle;
}

export type { LayoutMode };

export type CameraTarget =
  | { readonly kind: "overview" }
  | { readonly kind: "layer"; readonly layer: NoteKind }
  | { readonly kind: "region"; readonly region: string }
  | { readonly kind: "notes"; readonly ids: readonly NoteId[] }
  | { readonly kind: "tour"; readonly stops: readonly CameraTarget[] };

/** The floating note of the ambiguous term; null context while it is still the neutral, ambiguous word. */
export interface TermNoteState {
  readonly shown: boolean;
  readonly context: string | null;
}

/** Concepts the living glossary has collected, which of them are ambiguous, and which have been split by context. */
export interface GlossaryState {
  readonly entries: readonly string[];
  readonly ambiguous: readonly string[];
  readonly resolved: readonly string[];
}

export type ImpactModel = "anemic" | "rich";

/** The change-impact stage of module 1: which model is shown and how many of its places have lit up. */
export interface ImpactState {
  readonly model: ImpactModel | null;
  readonly revealed: number;
}

/** Everything visible at one moment. Pure data: animations derive from the difference between two states. */
export interface WallState {
  readonly notes: readonly WallNote[];
  readonly arrows: readonly WallArrow[];
  /** Keys of regions whose hand-drawn border is visible: a context name or "zone:<type>". */
  readonly boundaries: readonly string[];
  readonly layout: LayoutMode;
  readonly camera: CameraTarget;
  readonly term: TermNoteState;
  readonly glossary: GlossaryState;
  readonly impact: ImpactState;
  readonly code: CodeStageState;
  readonly pipeline: PipelineStageState;
  readonly architecture: ArchitectureStageState;
  readonly exercise: ExerciseStageState;
  /** Which version of the model the notes come from: the original or the one after the evolution. */
  readonly version: 1 | 2;
}

export const EMPTY_WALL: WallState = {
  notes: [],
  arrows: [],
  boundaries: [],
  layout: "timeline",
  camera: { kind: "overview" },
  term: { shown: false, context: null },
  glossary: { entries: [], ambiguous: [], resolved: [] },
  impact: { model: null, revealed: 0 },
  code: HIDDEN_CODE_STAGE,
  pipeline: HIDDEN_PIPELINE,
  architecture: HIDDEN_ARCHITECTURE,
  exercise: NO_EXERCISE,
  version: 1,
};

export function zoneKey(subdomainType: string): string {
  return `zone:${subdomainType}`;
}
