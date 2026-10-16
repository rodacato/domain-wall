import { describe, expect, it } from "vitest";
import { buildPackIndex } from "../PackIndex";
import { loadDefaultPack } from "../packFixtures";
import { evolveIndex } from "./evolveIndex";

describe("evolveIndex", () => {
  it("builds the pack as it is after the evolution scenario", () => {
    const index = buildPackIndex(loadDefaultPack());
    const evolved = evolveIndex(index);

    expect(evolved).toBeDefined();
    expect(evolved?.pack.events.length).toBeGreaterThan(index.pack.events.length);
    expect(evolved?.pack.commands.length).toBeGreaterThan(index.pack.commands.length);
  });

  it("leaves the original pack untouched", () => {
    const index = buildPackIndex(loadDefaultPack());
    const before = index.pack.events.length;

    evolveIndex(index);

    expect(index.pack.events.length).toBe(before);
  });
});
