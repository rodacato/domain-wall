import { z } from "zod";
import { err, ok, type Result } from "../shared/Result";
import type { ValidationIssue } from "../shared/ValidationIssue";
import { conceptIdSchema, moduleIdSchema, type ConceptId, type ModuleId } from "./ConceptId";

/** The interactive "wow" moments the wall can stage. Each module declares the ones it uses. */
export const INTERACTION_KINDS = [
  "costOfChangePropagation",
  "glossaryBuilding",
  "eventTimeline",
  "termTransformation",
  "contextMapAnimation",
  "subdomainBubbles",
  "semanticZoom",
  "invariantBreaker",
  "functionalPipeline",
  "beforeAfter",
  "adapterSwap",
  "evolutionDiff",
] as const;
export type InteractionKind = (typeof INTERACTION_KINDS)[number];

export const EXERCISE_KINDS = [
  "locateTheRule",
  "classifyPhrases",
  "orderEvents",
  "assignNotesToContexts",
  "implementAntiCorruptionLayer",
  "classifySubdomains",
  "implementTheRule",
  "addPipelineStage",
  "implementRepositoryAdapter",
  "implementTheChange",
] as const;
export type ExerciseKind = (typeof EXERCISE_KINDS)[number];

/** Where the explanation of a concept comes from. Chapters point to the book; the text is original. */
export const SOURCE_IDS = [
  "evans-blue-book",
  "evans-reference",
  "wlaschin",
  "vernon",
  "brandolini",
  "cockburn",
] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

const referenceSchema = z.strictObject({
  source: z.enum(SOURCE_IDS),
  /** Chapter numbers, or an empty list when the reference is to the work as a whole. */
  chapters: z.array(z.number().int().positive()),
});

export const conceptSchema = z.strictObject({
  id: conceptIdSchema,
  /** Where the functional perspective differs from classic DDD, the course labels it explicitly. */
  perspective: z.enum(["classic", "functional"]),
  /** True when the explanation has per-programming-language variants. */
  variesByProgrammingLanguage: z.boolean(),
});
export type Concept = z.infer<typeof conceptSchema>;

export const courseModuleSchema = z.strictObject({
  id: moduleIdSchema,
  number: z.number().int().min(1),
  concepts: z.array(conceptSchema).min(1),
  interactions: z.array(z.enum(INTERACTION_KINDS)),
  exercises: z.array(z.enum(EXERCISE_KINDS)),
  references: z.array(referenceSchema).min(1),
});
export type CourseModule = z.infer<typeof courseModuleSchema>;

export const syllabusSchema = z.strictObject({
  modules: z.array(courseModuleSchema).min(1),
});
export type Syllabus = z.infer<typeof syllabusSchema>;

export function parseSyllabus(candidate: unknown): Result<Syllabus, readonly ValidationIssue[]> {
  const parsed = syllabusSchema.safeParse(candidate);
  if (!parsed.success) {
    return err(
      parsed.error.issues.map((issue) => ({
        ruleId: "syllabus",
        path: issue.path.map(String).join("."),
        message: issue.message,
      })),
    );
  }
  const issues = checkSyllabusConsistency(parsed.data);
  return issues.length > 0 ? err(issues) : ok(parsed.data);
}

function checkSyllabusConsistency(syllabus: Syllabus): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenConcepts = new Set<string>();
  const seenModules = new Set<string>();
  syllabus.modules.forEach((courseModule, position) => {
    if (courseModule.number !== position + 1) {
      issues.push({
        ruleId: "syllabus",
        path: courseModule.id,
        message: `module number ${courseModule.number} is not in sequence (expected ${position + 1})`,
      });
    }
    if (seenModules.has(courseModule.id))
      issues.push({
        ruleId: "syllabus",
        path: courseModule.id,
        message: "module id is declared twice",
      });
    seenModules.add(courseModule.id);
    for (const concept of courseModule.concepts) {
      if (seenConcepts.has(concept.id))
        issues.push({
          ruleId: "syllabus",
          path: concept.id,
          message: "concept id is declared twice",
        });
      seenConcepts.add(concept.id);
    }
  });
  return issues;
}

export function allConcepts(syllabus: Syllabus): readonly Concept[] {
  return syllabus.modules.flatMap((courseModule) => courseModule.concepts);
}

export function findModule(syllabus: Syllabus, moduleId: ModuleId): CourseModule | undefined {
  return syllabus.modules.find((courseModule) => courseModule.id === moduleId);
}

export function moduleOfConcept(
  syllabus: Syllabus,
  conceptId: ConceptId,
): CourseModule | undefined {
  return syllabus.modules.find((courseModule) =>
    courseModule.concepts.some((concept) => concept.id === conceptId),
  );
}

/** The keys the "course" catalog of every locale must define for this syllabus. */
export function requiredCourseCatalogKeys(syllabus: Syllabus): readonly string[] {
  return syllabus.modules.flatMap((courseModule) => [
    `modules.${courseModule.id}.title`,
    `modules.${courseModule.id}.objective`,
    ...courseModule.concepts.flatMap((concept) => [
      `concepts.${concept.id}.title`,
      `concepts.${concept.id}.summary`,
    ]),
  ]);
}
