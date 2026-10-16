import { describe, expect, it } from "vitest";
import { outlineAggregate } from "./aggregateOutline";
import { buildPackIndex } from "./PackIndex";
import { loadDefaultPack } from "./packFixtures";

const index = buildPackIndex(loadDefaultPack());

describe("outlineAggregate", () => {
  it("lists the states, the transitions with their guards and events, and the invariants", () => {
    const outline = outlineAggregate(index, "Order");

    expect(outline?.initialState).toBe("Draft");
    expect(outline?.states.map((state) => state.codeName)).toContain("Delivered");
    const placing = outline?.transitions.find((transition) => transition.command === "PlaceOrder");
    expect(placing?.from).toEqual(["Draft"]);
    expect(placing?.guards).toContain("OrderMustHaveLines");
    expect(placing?.emits).toEqual(["OrderPlaced"]);
    expect(outline?.invariants).toContain("OrderLinesWithinLimit");
  });

  it("knows nothing of an aggregate the pack lacks", () => {
    expect(outlineAggregate(index, "Unicorn")).toBeUndefined();
  });
});
