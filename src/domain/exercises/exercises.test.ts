import { describe, expect, it } from "vitest";
import { loadPackDirectory } from "../../../scripts/lib/loadPackDirectory";
import { packDirectories } from "../../../scripts/lib/packDirectories";
import { buildPackIndex } from "../pack/PackIndex";
import { loadDefaultPack } from "../pack/packFixtures";
import {
  checkClassification,
  checkOrder,
  type ClassifyChallenge,
  type OrderChallenge,
} from "./Exercise";
import { deriveExercise } from "./deriveExercise";
import { seededShuffle, shuffledOtherwise } from "./shuffle";

const NO_CODE_KINDS = [
  "locateTheRule",
  "classifyPhrases",
  "orderEvents",
  "assignNotesToContexts",
  "implementAntiCorruptionLayer",
  "classifySubdomains",
] as const;

describe("deriving exercises from a pack", () => {
  const index = buildPackIndex(loadDefaultPack());

  it.each(NO_CODE_KINDS)("%s has a solution made of its own items and groups", (kind) => {
    const exercise = deriveExercise(index, kind);
    if (exercise === undefined) throw new Error(`no exercise for ${kind}`);
    const { challenge } = exercise;
    const ids = challenge.items.map((item) => item.id);

    expect(new Set(ids).size).toBe(ids.length);
    if (challenge.type === "classify") {
      const groups = new Set(challenge.groups.map((group) => group.id));
      for (const item of challenge.items) {
        expect(groups.has(challenge.solution[item.id] ?? "")).toBe(true);
      }
    } else {
      expect([...challenge.solution].sort()).toEqual([...ids].sort());
    }
  });

  it("orders events by the sequence of the business process", () => {
    const exercise = deriveExercise(index, "orderEvents");
    const solution = exercise?.challenge.type === "order" ? exercise.challenge.solution : [];
    const sequences = solution.map((id) => index.events.get(id)?.sequence ?? -1);

    expect(solution.length).toBeGreaterThanOrEqual(3);
    expect(sequences).toEqual([...sequences].sort((a, b) => a - b));
  });

  it("needs code for the code exercises", () => {
    expect(deriveExercise(index, "implementTheRule")).toBeUndefined();
  });

  it.each(packDirectories().map((directory) => [directory] as const))(
    "derives every no-code exercise for %s",
    (directory) => {
      const loaded = loadPackDirectory(directory);
      if (!loaded.ok) throw new Error(`${directory} does not parse`);
      const presetIndex = buildPackIndex(loaded.value);

      for (const kind of NO_CODE_KINDS) {
        expect(deriveExercise(presetIndex, kind), `${directory} ${kind}`).toBeDefined();
      }
    },
  );
});

describe("checking answers", () => {
  const classify: ClassifyChallenge = {
    type: "classify",
    items: [
      { id: "a", label: { kind: "ui", key: "a" } },
      { id: "b", label: { kind: "ui", key: "b" } },
    ],
    groups: [],
    solution: { a: "x", b: "y" },
  };
  const order: OrderChallenge = {
    type: "order",
    items: [],
    solution: ["one", "two", "three"],
  };

  it("names the items that are in the wrong group", () => {
    expect(checkClassification(classify, { a: "x", b: "x" })).toEqual({
      correct: false,
      wrong: ["b"],
    });
    expect(checkClassification(classify, { a: "x", b: "y" }).correct).toBe(true);
    expect(checkClassification(classify, {}).wrong).toEqual(["a", "b"]);
  });

  it("names the positions that are wrong in an order", () => {
    expect(checkOrder(order, ["one", "three", "two"])).toEqual({
      correct: false,
      wrong: ["two", "three"],
    });
    expect(checkOrder(order, ["one", "two", "three"]).correct).toBe(true);
  });
});

describe("seeded shuffle", () => {
  it("is the same for the same seed and keeps every item", () => {
    const items = [1, 2, 3, 4, 5, 6];

    expect(seededShuffle(items, "seed")).toEqual(seededShuffle(items, "seed"));
    expect([...seededShuffle(items, "seed")].sort()).toEqual(items);
  });

  it("never gives back the original order", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f", "g"]) {
      expect(shuffledOtherwise([1, 2, 3], seed)).not.toEqual([1, 2, 3]);
    }
  });
});
