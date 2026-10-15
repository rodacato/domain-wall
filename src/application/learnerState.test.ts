import { describe, expect, it } from "vitest";
import {
  InMemoryPreferencesRepository,
  InMemoryProgressRepository,
} from "../adapters/storage/InMemoryLearnerStorage";
import { loadSyllabus } from "../../scripts/lib/loadSyllabus";
import type { ConceptId } from "../domain/course/ConceptId";
import { err } from "../domain/shared/Result";
import type { PreferencesRepository } from "../ports/LearnerStorage";
import {
  loadLearnerState,
  recordConceptReached,
  savePreferences,
  type LearnerStorage,
} from "./learnerState";

const loaded = loadSyllabus();
if (!loaded.ok) throw new Error("the course syllabus does not parse");
const syllabus = loaded.value;

function freshStorage(): LearnerStorage {
  return {
    progress: new InMemoryProgressRepository(),
    preferences: new InMemoryPreferencesRepository(),
  };
}

const record = {
  completedAt: "2026-10-15T10:00:00Z",
  packId: "hecho-a-mano",
  programmingLanguage: "typescript",
  locale: "es-MX",
};
const concept = (id: string): ConceptId => id as ConceptId;

describe("loadLearnerState", () => {
  it("starts a first-time learner with onboarding, in the language of their browser", async () => {
    const state = await loadLearnerState(freshStorage(), ["es-AR", "en"]);

    expect(state.onboarded).toBe(false);
    expect(state.preferences.locale).toBe("es-MX");
    expect(state.preferences.programmingLanguage).toBe("typescript");
    expect(state.progress.completions).toEqual({});
  });

  it("returns a learner who has already chosen, with their saved choices", async () => {
    const storage = freshStorage();
    await savePreferences(storage, {
      locale: "en",
      programmingLanguage: "python",
      pack: { kind: "default" },
    });

    const state = await loadLearnerState(storage, ["es-MX"]);

    expect(state.onboarded).toBe(true);
    expect(state.preferences).toEqual({
      locale: "en",
      programmingLanguage: "python",
      pack: { kind: "default" },
    });
  });

  it("keeps working with defaults when storage fails, and reports the problem", async () => {
    const broken: PreferencesRepository = {
      load: () => Promise.resolve(err({ kind: "corrupt", message: "bad data" })),
      save: () => Promise.resolve(err({ kind: "unavailable", message: "blocked" })),
    };

    const state = await loadLearnerState(
      { progress: new InMemoryProgressRepository(), preferences: broken },
      ["en"],
    );

    expect(state.onboarded).toBe(false);
    expect(state.storageProblems).toEqual([{ kind: "corrupt", message: "bad data" }]);
    expect(
      await savePreferences(
        { progress: new InMemoryProgressRepository(), preferences: broken },
        state.preferences,
      ),
    ).toHaveLength(1);
  });
});

describe("recordConceptReached", () => {
  it("saves progress the first time and leaves it alone the second", async () => {
    const storage = freshStorage();
    const first = await recordConceptReached(
      storage,
      syllabus,
      (await loadLearnerState(storage, [])).progress,
      concept("storm.events"),
      record,
    );
    const second = await recordConceptReached(
      storage,
      syllabus,
      first.progress,
      concept("storm.events"),
      { ...record, locale: "en" },
    );

    expect(Object.keys(first.progress.completions)).toEqual(["storm.events"]);
    expect(second.progress).toBe(first.progress);
    expect(
      (await loadLearnerState(storage, [])).progress.completions[concept("storm.events")]?.locale,
    ).toBe("es-MX");
  });

  it("ignores a concept that is not in the syllabus", async () => {
    const storage = freshStorage();
    const outcome = await recordConceptReached(
      storage,
      syllabus,
      (await loadLearnerState(storage, [])).progress,
      concept("nope.nothing"),
      record,
    );

    expect(outcome.progress.completions).toEqual({});
  });
});
