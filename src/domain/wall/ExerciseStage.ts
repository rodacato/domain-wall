import type { ExerciseKind } from "../course/Syllabus";

/** The exercise open over the wall, if any. */
export interface ExerciseStageState {
  readonly kind: ExerciseKind | null;
}

export const NO_EXERCISE: ExerciseStageState = { kind: null };
