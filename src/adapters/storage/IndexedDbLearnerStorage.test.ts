import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import type { ConceptId } from "../../domain/course/ConceptId";
import { EMPTY_PROGRESS } from "../../domain/progress/Progress";
import {
  IndexedDbPackRepository,
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

describe("IndexedDbPackRepository", () => {
  it("keeps generated packs by key, and removes them", async () => {
    const opened = await openLearnerDatabase();
    if (!opened.ok) throw new Error("the database must open");
    const repository = new IndexedDbPackRepository(opened.value);
    const stored = {
      key: "abc",
      createdAt: "2026-10-15T00:00:00Z",
      description: "A bakery",
      pack: { a: 1 },
    };

    await repository.save(stored);
    const listed = await repository.list();
    expect(listed.ok && listed.value.some((entry) => entry.key === "abc")).toBe(true);

    await repository.remove("abc");
    const after = await repository.list();
    expect(after.ok && after.value.some((entry) => entry.key === "abc")).toBe(false);
  });

  it("keeps the draft of an unfinished generation apart from finished packs", async () => {
    const opened = await openLearnerDatabase();
    if (!opened.ok) throw new Error("the database must open");
    const repository = new IndexedDbPackRepository(opened.value);

    await repository.saveDraft({ key: "half", updatedAt: "2026-10-16T00:00:00Z", draft: { a: 1 } });

    expect(await repository.loadDraft("half")).toMatchObject({
      ok: true,
      value: { draft: { a: 1 } },
    });
    const listed = await repository.list();
    expect(listed.ok && listed.value.some((entry) => entry.key === "half")).toBe(false);

    await repository.removeDraft("half");
    expect(await repository.loadDraft("half")).toEqual({ ok: true, value: null });
  });
});
