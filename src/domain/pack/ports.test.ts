import { describe, expect, it } from "vitest";
import { buildPackIndex } from "./PackIndex";
import { loadDefaultPack } from "./packFixtures";
import { portsOf } from "./ports";

describe("portsOf", () => {
  const ports = portsOf(buildPackIndex(loadDefaultPack()));

  it("gives each aggregate a repository", () => {
    expect(ports.filter((port) => port.kind === "repository").map((port) => port.codeName)).toEqual(
      ["OrderRepository", "ListingRepository", "ShipmentRepository", "InvoiceRepository"],
    );
  });

  it("includes the gateways of the workflow and the translator of the external system", () => {
    expect(ports.find((port) => port.kind === "gateway")?.codeName).toBe("PaymentGatewayPort");
    expect(ports.find((port) => port.kind === "external")?.about).toBe("SatStampingService");
  });
});
