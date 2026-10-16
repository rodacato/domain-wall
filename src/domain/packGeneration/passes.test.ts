import { describe, expect, it } from "vitest";
import { loadDefaultPack } from "../pack/packFixtures";
import { packIdFor } from "./assembleDraft";
import { packCacheKey } from "./cacheKey";
import { PASSES, passOwning, passToRetry } from "./passes";

describe("the generation passes", () => {
  const pack = loadDefaultPack();

  it("together cover every part of the pack once", () => {
    const covered = PASSES.flatMap((pass) => [...pass.keys]).sort();
    const parts = Object.keys(pack).filter((key) => key !== "schemaVersion" && key !== "meta");

    expect(covered).toEqual([...parts].sort());
  });

  it.each(PASSES.map((pass) => [pass.id, pass] as const))(
    "%s accepts the matching part of a valid pack",
    (_id, pass) => {
      const part = Object.fromEntries(pass.keys.map((key) => [key, pack[key]]));

      expect(pass.schema.safeParse(part).success).toBe(true);
    },
  );

  it("rejects a part that has something extra or something missing", () => {
    const [storm] = PASSES;

    expect(storm?.schema.safeParse({ business: pack.business }).success).toBe(false);
  });

  it("sends an issue back to the pass that owns the part, preferring the latest", () => {
    expect(passOwning("aggregates")).toBe("model");
    expect(passToRetry(["commands.PlaceOrder", "aggregates.Order"])).toBe("model");
    expect(passToRetry(["events.OrderPlaced"])).toBe("storm");
    expect(passToRetry(["nowhere.at.all"])).toBeUndefined();
  });
});

describe("pack ids and cache keys", () => {
  it("makes a lowercase slug from the business name", () => {
    expect(packIdFor("Panadería «La Espiga»", "abcdef123")).toBe("panaderia-la-espiga-abcdef");
    expect(packIdFor("123", "abcdef")).toMatch(/^pack-123-abcdef$/);
  });

  it("is the same for the same request however it is spaced or cased", () => {
    const a = packCacheKey({
      description: "A  bakery in Puebla",
      locales: ["es-MX", "en"],
      model: "m",
    });
    const b = packCacheKey({
      description: " a bakery   in puebla ",
      locales: ["en", "es-MX"],
      model: "m",
    });

    expect(a).toBe(b);
    expect(packCacheKey({ description: "A bakery", locales: ["en"], model: "other" })).not.toBe(
      packCacheKey({ description: "A bakery", locales: ["en"], model: "m" }),
    );
  });
});
