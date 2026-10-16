import { describe, expect, it } from "vitest";
import { loadTemplates as loadTemplateFiles } from "../../scripts/lib/loadTemplates";
import { PROGRAMMING_LANGUAGES } from "../domain/language/ProgrammingLanguage";
import { buildPackIndex } from "../domain/pack/PackIndex";
import { loadDefaultPack } from "../domain/pack/packFixtures";
import { evolveIndex } from "../domain/pack/patch/evolveIndex";
import { codeChangeOf } from "./codeChange";
import type { TemplatesByLanguage } from "./loadTemplates";

const index = buildPackIndex(loadDefaultPack());
const evolved = evolveIndex(index);
const templates = Object.fromEntries(
  PROGRAMMING_LANGUAGES.map((language) => [language, loadTemplateFiles(language)]),
) as TemplatesByLanguage;

describe("codeChangeOf", () => {
  it.each(PROGRAMMING_LANGUAGES)("shows what the evolution added to Order in %s", (language) => {
    if (evolved === undefined) throw new Error("the default pack must evolve");

    const change = codeChangeOf(index, evolved, language, templates, {
      kind: "aggregate",
      aggregate: "Order",
    });
    const kinds = change?.entries.map((entry) => entry.kind) ?? [];

    expect(kinds).toContain("added");
    expect(kinds).toContain("same");
  });

  it("has nothing to show for a unit the evolution leaves alone", () => {
    if (evolved === undefined) throw new Error("the default pack must evolve");

    const change = codeChangeOf(index, index, "typescript", templates, {
      kind: "aggregate",
      aggregate: "Order",
    });

    expect(change?.entries.every((entry) => entry.kind === "gap")).toBe(true);
  });
});
