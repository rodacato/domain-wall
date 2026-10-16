import { describe, expect, it } from "vitest";
import { buildPackIndex } from "../PackIndex";
import { loadDefaultPack } from "../packFixtures";
import { attacksOn } from "./attacks";

const index = buildPackIndex(loadDefaultPack());

describe("attacksOn", () => {
  it("proposes one attack per rule, and the aggregate rejects each with that rule", () => {
    const attacks = attacksOn(index, "Order");

    expect(attacks.map((attack) => attack.rule).sort()).toEqual(
      (index.aggregates.get("Order")?.rules ?? []).map((rule) => rule.codeName).sort(),
    );
    for (const attack of attacks) {
      expect(attack.rejection.kind).toBe("ruleViolated");
    }
  });

  it("tells guards from invariants", () => {
    const attacks = attacksOn(index, "Order");

    expect(attacks.find((attack) => attack.rule === "OrderMustHaveLines")?.phase).toBe("guard");
    expect(attacks.find((attack) => attack.rule === "OrderLinesWithinLimit")?.phase).toBe(
      "invariant",
    );
  });

  it("has no attacks on an unknown aggregate", () => {
    expect(attacksOn(index, "Unicorn")).toEqual([]);
  });
});
