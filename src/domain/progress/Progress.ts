import { z } from "zod";
import { conceptIdSchema, type ConceptId, type ModuleId } from "../course/ConceptId";
import { allConcepts, findModule, type Syllabus } from "../course/Syllabus";
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

export const progressSchema = z.strictObject({
  schemaVersion: z.literal(PROGRESS_SCHEMA_VERSION),
  completions: z.record(conceptIdSchema, completionRecordSchema),
});
export type Progress = z.infer<typeof progressSchema>;

export interface ProgressError {
  readonly kind: "unknownConcept";
  readonly conceptId: string;
}

export const EMPTY_PROGRESS: Progress = { schemaVersion: PROGRESS_SCHEMA_VERSION, completions: {} };

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
