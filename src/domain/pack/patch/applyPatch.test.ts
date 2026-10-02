import { describe, expect, it } from "vitest";
import { loadDefaultPack, required } from "../packFixtures";
import type { DomainPack } from "../schema/DomainPack";
import { applyPatch } from "./applyPatch";

const pack = loadDefaultPack();
const orderIn = (candidate: DomainPack) =>
  required(
    candidate.aggregates.find((a) => a.codeName === "Order"),
    "Order",
  );

describe("applyPatch", () => {
  it("restricts a transition without touching the original pack", () => {
    const patched = applyPatch(pack, pack.changeScenarios.businessChange.patch);

    const cancelFrom = (candidate: DomainPack) =>
      orderIn(candidate).transitions.find((t) => t.command === "CancelOrder")?.from;
    expect(patched.ok && cancelFrom(patched.value)).toEqual(["Draft", "Placed"]);
    expect(cancelFrom(pack)).toEqual(["Draft", "Placed", "Paid"]);
  });

  it("applies the evolution: new states and a rerouted shipping transition", () => {
    const patched = applyPatch(pack, pack.changeScenarios.evolution.patch);

    const order = patched.ok ? orderIn(patched.value) : undefined;
    expect(order?.states.map((s) => s.codeName)).toContain("InProduction");
    const shipFrom = order?.transitions
      .filter((t) => t.command === "MarkOrderShipped")
      .map((t) => t.from);
    expect(shipFrom).toEqual([["ReadyToShip"]]);
  });

  it("reports an operation on an aggregate that does not exist", () => {
    const patched = applyPatch(pack, [
      {
        op: "restrictTransition",
        aggregate: "Ghost" as never,
        command: "CancelOrder" as never,
        removeFrom: ["Paid" as never],
      },
    ]);

    expect(patched.ok).toBe(false);
  });

  it("reports restricting a command that has no transition", () => {
    const patched = applyPatch(pack, [
      {
        op: "restrictTransition",
        aggregate: "Order" as never,
        command: "NoSuchCommand" as never,
        removeFrom: ["Paid" as never],
      },
    ]);

    expect(patched.ok).toBe(false);
  });
});
