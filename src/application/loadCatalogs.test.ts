import { describe, expect, it } from "vitest";
import { loadCatalogs } from "./loadCatalogs";

describe("loadCatalogs", () => {
  it("prefixes keys with their namespace and groups them by locale", () => {
    const catalogs = loadCatalogs({
      "./content/locales/en/course.json": { modules: { a: { title: "A" } } },
      "./content/locales/es-MX/course.json": { modules: { a: { title: "Uno" } } },
      "./content/locales/en/ui.json": { player: { next: "Next" } },
    });

    expect(catalogs.en).toEqual({ "course.modules.a.title": "A", "ui.player.next": "Next" });
    expect(catalogs["es-MX"]).toEqual({ "course.modules.a.title": "Uno" });
  });

  it("ignores files of unsupported locales and unexpected paths", () => {
    const catalogs = loadCatalogs({
      "./content/locales/fr/ui.json": { a: "b" },
      "./other.json": { a: "b" },
    });

    expect(catalogs.en).toEqual({});
  });
});
