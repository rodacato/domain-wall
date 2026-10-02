import { describe, expect, it } from "vitest";
import { negotiateLocale } from "./LocaleRegistry";

describe("negotiateLocale", () => {
  it("keeps an exactly supported locale", () => {
    expect(negotiateLocale(["es-MX", "en"])).toBe("es-MX");
  });

  it("maps another regional variant to the supported locale of the same language", () => {
    expect(negotiateLocale(["es-AR"])).toBe("es-MX");
    expect(negotiateLocale(["en-GB"])).toBe("en");
  });

  it("skips unsupported languages in preference order", () => {
    expect(negotiateLocale(["fr-FR", "en-US"])).toBe("en");
  });

  it("falls back to the canonical locale when nothing matches", () => {
    expect(negotiateLocale(["ja-JP"])).toBe("en");
    expect(negotiateLocale([])).toBe("en");
  });
});
