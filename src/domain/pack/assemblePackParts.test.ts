import { describe, expect, it } from "vitest";
import { assemblePackParts } from "./assemblePackParts";

describe("assemblePackParts", () => {
  it("concatenates arrays and merges objects with disjoint keys, in file-name order", () => {
    const assembled = assemblePackParts({
      "20-b.json": { events: ["second"], dialogues: { two: [] } },
      "10-a.json": { events: ["first"], dialogues: { one: [] }, business: "kept" },
    });

    expect(assembled).toEqual({
      ok: true,
      value: { events: ["first", "second"], dialogues: { one: [], two: [] }, business: "kept" },
    });
  });

  it("reports a key defined twice that cannot be merged", () => {
    const assembled = assemblePackParts({
      "a.json": { business: "one" },
      "b.json": { business: "two" },
    });

    expect(assembled.ok).toBe(false);
  });

  it("reports an object key defined in two parts", () => {
    const assembled = assemblePackParts({
      "a.json": { dialogues: { one: [] } },
      "b.json": { dialogues: { one: [] } },
    });

    expect(assembled.ok).toBe(false);
  });

  it("rejects a part that is not an object", () => {
    expect(assemblePackParts({ "a.json": [] }).ok).toBe(false);
  });
});
