import { z } from "zod";
import { conceptIdSchema, type ConceptId, type ModuleId } from "../course/ConceptId";
import {
  allConcepts,
  EXERCISE_KINDS,
  findModule,
  type ExerciseKind,
  type Syllabus,
} from "../course/Syllabus";
import { err, ok, type Result } from "../shared/Result";

export const PROGRESS_SCHEMA_VERSION = 1;

/** Context of a completion. Kept as history only: progress never depends on it. */
const completionRecordSchema = z.strictObject({
  completedAt: z.iso.datetime(),
  packId: z.string().min(1),
  programmingLanguage: z.string().min(1),
  locale: z.string().min(1),
});
export type CompletionRecord = z.infer<typeof completionRecordSchema>;

/** What shows an exercise was solved: a checked answer, code that only looks right, or passing tests, which replaces the others. */
export const EXERCISE_EVIDENCE = ["answered", "reviewed", "tested"] as const;
export type ExerciseEvidence = (typeof EXERCISE_EVIDENCE)[number];

/** Records saved before evidence existed have none and read as `answered`. */
const exerciseRecordSchema = completionRecordSchema.extend({
  evidence: z.enum(EXERCISE_EVIDENCE).optional(),
});
export type ExerciseRecord = z.infer<typeof exerciseRecordSchema>;

export const progressSchema = z.strictObject({
  schemaVersion: z.literal(PROGRESS_SCHEMA_VERSION),
  completions: z.record(conceptIdSchema, completionRecordSchema),
  /** Exercises the learner has solved; absent in progress saved before exercises existed. */
  exercises: z.partialRecord(z.enum(EXERCISE_KINDS), exerciseRecordSchema).default({}),
});
export type Progress = z.infer<typeof progressSchema>;

export interface ProgressError {
  readonly kind: "unknownConcept";
  readonly conceptId: string;
}

export const EMPTY_PROGRESS: Progress = {
  schemaVersion: PROGRESS_SCHEMA_VERSION,
  completions: {},
  exercises: {},
};

/** Marks a concept completed. Completing it twice keeps the first record. */
export function completeConcept(
  progress: Progress,
  syllabus: Syllabus,
  conceptId: ConceptId,
  record: CompletionRecord,
): Result<Progress, ProgressError> {
  if (!allConcepts(syllabus).some((concept) => concept.id === conceptId)) {
    return err({ kind: "unknownConcept", conceptId });
  }
  if (progress.completions[conceptId] !== undefined) return ok(progress);
  return ok({ ...progress, completions: { ...progress.completions, [conceptId]: record } });
}

export function isConceptCompleted(progress: Progress, conceptId: ConceptId): boolean {
  return progress.completions[conceptId] !== undefined;
}

export interface ModuleCompletion {
  readonly completed: number;
  readonly total: number;
}

export function moduleCompletion(
  progress: Progress,
  syllabus: Syllabus,
  moduleId: ModuleId,
): ModuleCompletion {
  const concepts = findModule(syllabus, moduleId)?.concepts ?? [];
  return {
    completed: concepts.filter((concept) => isConceptCompleted(progress, concept.id)).length,
    total: concepts.length,
  };
}

/** The first concept of the syllabus, in order, that has not been completed; undefined when all are. */
export function nextConcept(progress: Progress, syllabus: Syllabus): ConceptId | undefined {
  return allConcepts(syllabus).find((concept) => !isConceptCompleted(progress, concept.id))?.id;
}

/** Marks an exercise solved. Solving it again keeps the first record, unless the new one has stronger evidence. */
export function completeExercise(
  progress: Progress,
  kind: ExerciseKind,
  record: ExerciseRecord & { readonly evidence: ExerciseEvidence },
): Progress {
  const known = exerciseEvidence(progress, kind);
  if (known !== undefined && strength(known) >= strength(record.evidence)) return progress;
  return { ...progress, exercises: { ...progress.exercises, [kind]: record } };
}

export function exerciseEvidence(
  progress: Progress,
  kind: ExerciseKind,
): ExerciseEvidence | undefined {
  const record = progress.exercises[kind];
  return record === undefined ? undefined : (record.evidence ?? "answered");
}

function strength(evidence: ExerciseEvidence): number {
  return EXERCISE_EVIDENCE.indexOf(evidence);
}
