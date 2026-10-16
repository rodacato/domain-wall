import { describe, expect, it } from "vitest";
import { buildPackIndex } from "./PackIndex";
import { loadDefaultPack } from "./packFixtures";
import { shapeWorkflow } from "./workflowShape";

const shaped = shapeWorkflow(buildPackIndex(loadDefaultPack()));

describe("shapeWorkflow", () => {
  it("gives every stage the full fields of its input and output types", () => {
    const pricing = shaped.find((entry) => entry.stage.codeName === "PriceCheckout");

    expect(pricing?.input.codeName).toBe("ValidatedCheckout");
    expect(pricing?.output.codeName).toBe("PricedCheckout");
    expect(pricing?.output.fields.map((field) => field.codeName)).toContain("buyerId");
    expect(pricing?.output.fields.map((field) => field.codeName)).toContain("total");
  });

  it("tells what each stage adds to the type it receives", () => {
    const pricing = shaped.find((entry) => entry.stage.codeName === "PriceCheckout");
    const charging = shaped.find((entry) => entry.stage.codeName === "ChargePayment");

    expect(pricing?.output.added).toEqual(["total"]);
    expect(charging?.output.added).toEqual(["paidAmount"]);
  });
});
