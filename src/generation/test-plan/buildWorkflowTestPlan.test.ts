import { describe, expect, it } from "vitest";
import { loadPackDirectory } from "../../../scripts/lib/loadPackDirectory";
import { packDirectories } from "../../../scripts/lib/packDirectories";
import { buildPackIndex } from "../../domain/pack/PackIndex";
import { loadDefaultPack } from "../../domain/pack/packFixtures";
import { buildWorkflowTestPlan } from "./buildWorkflowTestPlan";

describe("the workflow test plan", () => {
  const plan = buildWorkflowTestPlan(buildPackIndex(loadDefaultPack()));

  it("builds a raw input with one valid value for each field of the first type", () => {
    expect(plan?.input.map((field) => field.name)).toEqual([
      "buyerId",
      "listingId",
      "quantity",
      "unitPrice",
      "postalCode",
    ]);
  });

  it("works out what the compute stage must produce", () => {
    const quantity = plan?.input.find((field) => field.name === "quantity")?.value;
    const unitPrice = plan?.input.find((field) => field.name === "unitPrice")?.value;

    expect(plan?.computed).toHaveLength(1);
    expect(plan?.computed[0]?.value).toBe(Number(quantity) * Number(unitPrice));
  });

  it("makes each port that a stage calls answer with the data the stage adds", () => {
    expect(plan?.receipts.map((receipt) => receipt.port)).toEqual([
      "PaymentGatewayPort",
      "PlaceCheckoutPort",
    ]);
    expect(plan?.receipts[0]?.fields.map((field) => field.name)).toEqual(["paidAmount"]);
  });

  it("fails each validation and each port error the stages declare", () => {
    expect(plan?.validationFailures.length).toBeGreaterThan(0);
    expect(plan?.portFailures.map((failure) => failure.code)).toEqual([
      "PaymentDeclined",
      "PaymentGatewayUnavailable",
      "OrderCouldNotBeSaved",
    ]);
  });

  it.each(packDirectories().map((directory) => [directory] as const))(
    "plans something to check in %s",
    (directory) => {
      const loaded = loadPackDirectory(directory);
      if (!loaded.ok) throw new Error(`${directory} does not parse`);
      const planned = buildWorkflowTestPlan(buildPackIndex(loaded.value));

      expect(planned?.validationFailures.length).toBeGreaterThan(0);
      expect(planned?.portFailures.length).toBeGreaterThan(0);
      expect(planned?.computed.length).toBeGreaterThan(0);
    },
  );
});
