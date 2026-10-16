import type { ConceptId, ModuleId } from "../course/ConceptId";
import type { DialogueSlot } from "../pack/schema/Dialogue";
import type { SubdomainType } from "../pack/schema/Strategy";
import { applyWallCommands } from "./applyWallCommand";
import type { WallCommand } from "./WallCommand";
import { EMPTY_WALL, type ContextPattern, type WallState } from "./WallState";

/** What a code step asks the learner to look at; each has a general text and one per programming language. */
export const LOOK_AT_NOTES = [
  "valueObject",
  "entity",
  "aggregateOutline",
  "aggregateCode",
  "invariant",
  "event",
  "repository",
  "factory",
  "domainService",
  "applicationService",
  "constrainedTypes",
  "statesAsTypes",
  "illegalStates",
  "pipeline",
  "errorsAsValues",
  "statesAsTypesCode",
  "pipelineCode",
  "errorsAsValuesCode",
  "newNotes",
  "evolutionDiff",
  "breakthrough",
  "layers",
  "hexagonal",
  "portsAdapters",
  "dependencyRule",
  "adapterCode",
] as const;
export type LookAtNote = (typeof LOOK_AT_NOTES)[number];

/** Extra pack text the narration panel shows next to the concept of a step. */
export type NarrationFocus =
  | { readonly kind: "zone"; readonly zone: SubdomainType }
  | { readonly kind: "pattern"; readonly pattern: ContextPattern }
  | { readonly kind: "changeStory"; readonly scenario: "businessChange" | "evolution" }
  /** What to notice in the code on screen; the subject is an anchor reference or an aggregate name. */
  | { readonly kind: "lookAt"; readonly note: LookAtNote; readonly subject: string | null };

/** One beat of a scene: what the wall does, which expert conversation plays and which concept is being taught. */
export interface SceneStep {
  readonly id: string;
  readonly concept: ConceptId | null;
  readonly dialogue: DialogueSlot | null;
  readonly focus?: NarrationFocus;
  readonly commands: readonly WallCommand[];
}

export interface Scene {
  readonly id: string;
  readonly module: ModuleId;
  /** Commands that bring the wall to where this scene starts, for example the wall left by the previous module. */
  readonly prelude: readonly WallCommand[];
  readonly steps: readonly SceneStep[];
}

export function wallBeforeScene(scene: Scene): WallState {
  return applyWallCommands(EMPTY_WALL, scene.prelude);
}

/** The wall right after the given step (0-based), counting from the prelude; this is what lets the scrubber rewind. */
export function wallAfterStep(scene: Scene, stepIndex: number): WallState {
  return scene.steps
    .slice(0, stepIndex + 1)
    .reduce((state, step) => applyWallCommands(state, step.commands), wallBeforeScene(scene));
}
