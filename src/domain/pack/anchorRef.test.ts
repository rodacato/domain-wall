import { describe, expect, it } from "vitest";
import { labelOfAnchor, parseAnchorRef } from "./anchorRef";
import { buildPackIndex } from "./PackIndex";
import { loadDefaultPack } from "./packFixtures";

const index = buildPackIndex(loadDefaultPack());

describe("parseAnchorRef", () => {
  it("reads every shape of reference the generator emits", () => {
    expect(parseAnchorRef("Order")).toEqual({ kind: "aggregate", aggregate: "Order", name: null });
    expect(parseAnchorRef("Order.rule.OrderMustHaveLines")).toEqual({
      kind: "rule",
      aggregate: "Order",
      name: "OrderMustHaveLines",
    });
    expect(parseAnchorRef("Order.transition.CancelOrder.2")).toEqual({
      kind: "transition",
      aggregate: "Order",
      name: "CancelOrder",
    });
    expect(parseAnchorRef("Order.factory")?.kind).toBe("factory");
    expect(parseAnchorRef("event.OrderPlaced")).toEqual({
      kind: "event",
      aggregate: null,
      name: "OrderPlaced",
    });
    expect(parseAnchorRef("valueObject.Money")?.kind).toBe("valueObject");
  });

  it("rejects references it does not know", () => {
    expect(parseAnchorRef("Order.unknown.Thing")).toBeUndefined();
  });
});

describe("labelOfAnchor", () => {
  it("uses the label the pack gives the concept", () => {
    expect(labelOfAnchor(index, "Order.rule.OrderMustHaveLines")?.en).toBeDefined();
    expect(labelOfAnchor(index, "Order.state.Draft")?.en).toBeDefined();
    expect(labelOfAnchor(index, "Order.command.PlaceOrder")?.en).toBeDefined();
    expect(labelOfAnchor(index, "event.OrderPlaced")?.en).toBeDefined();
    expect(labelOfAnchor(index, "valueObject.Money")?.en).toBeDefined();
    expect(labelOfAnchor(index, "Order.entity.OrderLine")?.en).toBeDefined();
  });

  it("leaves the factory and the repository to the UI", () => {
    expect(labelOfAnchor(index, "Order.factory")).toBeUndefined();
    expect(labelOfAnchor(index, "Order.repository")).toBeUndefined();
  });
});
