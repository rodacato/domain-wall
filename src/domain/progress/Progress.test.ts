import { describe, expect, it } from "vitest";
import { loadSyllabus } from "../../../scripts/lib/loadSyllabus";
import type { ConceptId, ModuleId } from "../course/ConceptId";
import {
  completeConcept,
  EMPTY_PROGRESS,
  isConceptCompleted,
  moduleCompletion,
  nextConcept,
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
