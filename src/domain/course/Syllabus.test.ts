import { describe, expect, it } from "vitest";
import { loadSyllabus } from "../../../scripts/lib/loadSyllabus";
import {
  allConcepts,
  moduleOfConcept,
  parseSyllabus,
  requiredCourseCatalogKeys,
  type Syllabus,
} from "./Syllabus";
import type { ConceptId } from "./ConceptId";

function syllabus(): Syllabus {
  const loaded = loadSyllabus();
  if (!loaded.ok) throw new Error("the course syllabus does not parse");
  return loaded.value;
}

describe("the course syllabus", () => {
  it("has the ten modules of the course, in order", () => {
    expect(syllabus().modules.map((m) => m.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("has unique concept ids", () => {
    const ids = allConcepts(syllabus()).map((concept) => concept.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks the functional modeling concepts with the functional perspective", () => {
    const functional = allConcepts(syllabus()).filter(
      (concept) => concept.perspective === "functional",
    );

    expect(functional.map((concept) => concept.id.split(".")[0])).toEqual(
      Array(functional.length).fill("functional"),
    );
  });

  it("finds the module that owns a concept", () => {
    expect(moduleOfConcept(syllabus(), "tactical.aggregate" as ConceptId)?.id).toBe(
      "tactical-building-blocks",
    );
  });

  it("requires a title and a summary for every concept and a title and objective for every module", () => {
    const keys = requiredCourseCatalogKeys(syllabus());

    expect(keys).toContain("modules.why-ddd.objective");
    expect(keys).toContain("concepts.map.anticorruption-layer.summary");
  });

  it("rejects modules out of sequence and duplicated concepts", () => {
    const broken = structuredClone(syllabus());
    const second = broken.modules[1];
    if (second === undefined) throw new Error("fixture");
    second.number = 5;
    second.concepts.push(structuredClone(allConcepts(syllabus())[0] as never));

    const outcome = parseSyllabus(broken);

    expect(outcome.ok ? [] : outcome.error.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("not in sequence"),
        expect.stringContaining("declared twice"),
      ]),
    );
  });
});
