import { describe, expect, it } from "vitest";
import { loadSyllabus } from "../../../scripts/lib/loadSyllabus";
import type { ConceptId, ModuleId } from "../course/ConceptId";
import {
  completeConcept,
  completeExercise,
  EMPTY_PROGRESS,
  isConceptCompleted,
  exerciseEvidence,
  moduleCompletion,
  nextConcept,
  progressSchema,
  type CompletionRecord,
} from "./Progress";

const loaded = loadSyllabus();
if (!loaded.ok) throw new Error("the course syllabus does not parse");
const syllabus = loaded.value;

const record: CompletionRecord = {
  completedAt: "2026-10-02T12:00:00Z",
  packId: "hecho-a-mano",
  programmingLanguage: "typescript",
  locale: "es-MX",
};
const concept = (id: string): ConceptId => id as ConceptId;

describe("progress", () => {
  it("starts at the first concept of the syllabus", () => {
    expect(nextConcept(EMPTY_PROGRESS, syllabus)).toBe("why.ball-of-mud");
  });

  it("records a completion and advances to the next concept", () => {
    const outcome = completeConcept(EMPTY_PROGRESS, syllabus, concept("why.ball-of-mud"), record);

    expect(outcome.ok && isConceptCompleted(outcome.value, concept("why.ball-of-mud"))).toBe(true);
    expect(outcome.ok && nextConcept(outcome.value, syllabus)).toBe("why.anemic-model");
  });

  it("keeps the first record when a concept is completed again, whatever the industry or language", () => {
    const first = completeConcept(EMPTY_PROGRESS, syllabus, concept("why.ball-of-mud"), record);
    if (!first.ok) throw new Error("fixture");

    const again = completeConcept(first.value, syllabus, concept("why.ball-of-mud"), {
      ...record,
      packId: "clinic",
      locale: "en",
    });

    expect(again.ok && again.value.completions[concept("why.ball-of-mud")]?.packId).toBe(
      "hecho-a-mano",
    );
  });

  it("rejects a concept that is not in the syllabus", () => {
    expect(completeConcept(EMPTY_PROGRESS, syllabus, concept("nope.nothing"), record)).toEqual({
      ok: false,
      error: { kind: "unknownConcept", conceptId: "nope.nothing" },
    });
  });

  it("counts completion per module", () => {
    const outcome = completeConcept(EMPTY_PROGRESS, syllabus, concept("lang.glossary"), record);

    expect(
      outcome.ok && moduleCompletion(outcome.value, syllabus, "ubiquitous-language" as ModuleId),
    ).toEqual({ completed: 1, total: 3 });
  });
});

describe("exercise progress", () => {
  it("records a solved exercise once, keeping the first record", () => {
    const solved = completeExercise(EMPTY_PROGRESS, "orderEvents", {
      ...record,
      evidence: "answered",
    });
    const again = completeExercise(solved, "orderEvents", {
      ...record,
      locale: "en",
      evidence: "answered",
    });

    expect(exerciseEvidence(solved, "orderEvents")).toBe("answered");
    expect(exerciseEvidence(solved, "classifyPhrases")).toBeUndefined();
    expect(again.exercises.orderEvents?.locale).toBe("es-MX");
  });

  it("replaces code that only looked right with passing tests, never the other way", () => {
    const reviewed = completeExercise(EMPTY_PROGRESS, "implementTheRule", {
      ...record,
      evidence: "reviewed",
    });
    const tested = completeExercise(reviewed, "implementTheRule", {
      ...record,
      evidence: "tested",
    });
    const reviewedAgain = completeExercise(tested, "implementTheRule", {
      ...record,
      evidence: "reviewed",
    });

    expect(exerciseEvidence(reviewed, "implementTheRule")).toBe("reviewed");
    expect(exerciseEvidence(tested, "implementTheRule")).toBe("tested");
    expect(exerciseEvidence(reviewedAgain, "implementTheRule")).toBe("tested");
  });

  it("reads an exercise saved before evidence existed as answered", () => {
    const parsed = progressSchema.safeParse({
      schemaVersion: 1,
      completions: {},
      exercises: { orderEvents: record },
    });

    expect(parsed.success && exerciseEvidence(parsed.data, "orderEvents")).toBe("answered");
  });

  it("reads progress saved before exercises existed", () => {
    const parsed = progressSchema.safeParse({ schemaVersion: 1, completions: {} });

    expect(parsed.success && parsed.data.exercises).toEqual({});
  });
});
