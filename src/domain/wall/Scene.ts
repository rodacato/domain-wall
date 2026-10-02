import type { ConceptId, ModuleId } from "../course/ConceptId";
import type { DialogueSlot } from "../pack/schema/Dialogue";
import { applyWallCommands } from "./applyWallCommand";
import type { WallCommand } from "./WallCommand";
import { EMPTY_WALL, type WallState } from "./WallState";

/** One beat of a scene: what the wall does, which expert conversation plays and which concept is being taught. */
export interface SceneStep {
  readonly id: string;
  readonly concept: ConceptId | null;
  readonly dialogue: DialogueSlot | null;
  readonly commands: readonly WallCommand[];
}

export interface Scene {
  readonly id: string;
  readonly module: ModuleId;
  /** Commands that bring the wall to where this scene starts, for example the wall left by the previous module. */
  readonly prelude: readonly WallCommand[];
  readonly steps: readonly SceneStep[];
}

/** The wall before the first step of a scene. */
export function wallBeforeScene(scene: Scene): WallState {
  return applyWallCommands(EMPTY_WALL, scene.prelude);
}

/** The wall as it looks right after the given step (0-based), counting from the scene's prelude. This is what makes the scrubber possible. */
export function wallAfterStep(scene: Scene, stepIndex: number): WallState {
  return scene.steps
    .slice(0, stepIndex + 1)
    .reduce((state, step) => applyWallCommands(state, step.commands), wallBeforeScene(scene));
}
