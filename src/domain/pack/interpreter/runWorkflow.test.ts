import { describe, expect, it } from "vitest";
import { buildPackIndex } from "../PackIndex";
import { loadDefaultPack } from "../packFixtures";
import { runWorkflow } from "./runWorkflow";

const index = buildPackIndex(loadDefaultPack());
const stages = index.pack.workflow.stages.map((stage) => stage.codeName);

describe("runWorkflow", () => {
  it("passes every stage when nothing is injected", () => {
    expect(runWorkflow(index, {}).map((run) => run.outcome)).toEqual(stages.map(() => "passed"));
  });

  it("stops at the first failure and skips what comes after", () => {
    const runs = runWorkflow(index, { ChargePayment: "PaymentDeclined" });

    expect(runs.map((run) => run.outcome)).toEqual(["passed", "passed", "failed", "skipped"]);
    expect(runs[2]?.error).toBe("PaymentDeclined");
  });

  it("only the first of several failures counts", () => {
    const runs = runWorkflow(index, {
      ValidateCheckout: "CheckoutDataInvalid",
      ChargePayment: "PaymentDeclined",
    });

    expect(runs.map((run) => run.outcome)).toEqual(["failed", "skipped", "skipped", "skipped"]);
  });

  it("ignores an error the stage cannot produce", () => {
    const runs = runWorkflow(index, { PriceCheckout: "PaymentDeclined" });

    expect(runs.every((run) => run.outcome === "passed")).toBe(true);
  });
});
