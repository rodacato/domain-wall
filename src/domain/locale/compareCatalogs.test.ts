import { describe, expect, it } from "vitest";
import { compareCatalogs, flattenCatalog } from "./compareCatalogs";

describe("flattenCatalog", () => {
  it("joins nested keys with dots", () => {
    expect(flattenCatalog({ a: { b: "x", c: { d: "y" } }, e: "z" })).toEqual({
      "a.b": "x",
      "a.c.d": "y",
      e: "z",
    });
  });
});

describe("compareCatalogs", () => {
  const catalogs = (spanish: Record<string, string>) => ({
    en: { greeting: "Hello {name}", farewell: "Bye" },
    "es-MX": spanish,
  });

  it("accepts complete catalogs with matching placeholders", () => {
    expect(
      compareCatalogs(catalogs({ greeting: "Hola {name}", farewell: "Adiós" }), "common"),
    ).toEqual([]);
  });

  it("reports missing, extra and blank entries", () => {
    const issues = compareCatalogs(catalogs({ greeting: " ", extra: "sobra" }), "common");

    expect(issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        "missing translation",
        "blank translation",
        "key does not exist in en",
      ]),
    );
  });

  it("reports a placeholder that was renamed or dropped", () => {
    const issues = compareCatalogs(
      catalogs({ greeting: "Hola {nombre}", farewell: "Adiós" }),
      "common",
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("placeholders differ");
  });
});
