import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import type { ConceptId } from "../../domain/course/ConceptId";
import { EMPTY_PROGRESS } from "../../domain/progress/Progress";
import {
  IndexedDbPreferencesRepository,
  IndexedDbProgressRepository,
  openLearnerDatabase,
} from "./IndexedDbLearnerStorage";

async function repositories() {
  const opened = await openLearnerDatabase();
  if (!opened.ok) throw new Error(opened.error.message);
  return {
    database: opened.value,
    progress: new IndexedDbProgressRepository(opened.value),
    preferences: new IndexedDbPreferencesRepository(opened.value),
  };
}

describe("the IndexedDB learner storage", () => {
  it("returns null before anything is saved", async () => {
    const { progress, preferences } = await repositories();

    expect(await progress.load()).toEqual({ ok: true, value: null });
    expect(await preferences.load()).toEqual({ ok: true, value: null });
  });

  it("round-trips progress and preferences", async () => {
    const { progress, preferences } = await repositories();
    const withOne = {
      ...EMPTY_PROGRESS,
      completions: {
        ["storm.events" as ConceptId]: {
          completedAt: "2026-10-15T10:00:00Z",
          packId: "hecho-a-mano",
          programmingLanguage: "typescript",
          locale: "en",
        },
      },
    };

    await progress.save(withOne);
    await preferences.save({
      locale: "es-MX",
      programmingLanguage: "ruby",
      pack: { kind: "preset", packId: "clinic" },
    });

    expect(await progress.load()).toEqual({ ok: true, value: withOne });
    expect(await preferences.load()).toEqual({
      ok: true,
      value: {
        locale: "es-MX",
        programmingLanguage: "ruby",
        pack: { kind: "preset", packId: "clinic" },
      },
    });
  });

  it("reports stored data that no longer matches the schema as corrupt", async () => {
    const { database, preferences } = await repositories();
    await database.put("learner", { locale: "klingon" }, "preferences");

    const loaded = await preferences.load();

    expect(loaded.ok).toBe(false);
    expect(!loaded.ok && loaded.error.kind).toBe("corrupt");
  });
});
