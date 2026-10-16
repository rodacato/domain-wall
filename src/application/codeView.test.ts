import { describe, expect, it } from "vitest";
import { loadTemplates as loadTemplateFiles } from "../../scripts/lib/loadTemplates";
import { PROGRAMMING_LANGUAGES } from "../domain/language/ProgrammingLanguage";
import { buildPackIndex } from "../domain/pack/PackIndex";
import { loadDefaultPack } from "../domain/pack/packFixtures";
import {
  anchorsInReadingOrder,
  focusedLines,
  innermostAnchorAt,
  sourceFileOf,
  type GeneratedFile,
} from "./codeView";
import { generateCode } from "./generateCode";
import type { TemplatesByLanguage } from "./loadTemplates";

const index = buildPackIndex(loadDefaultPack());
const templates = Object.fromEntries(
  PROGRAMMING_LANGUAGES.map((language) => [language, loadTemplateFiles(language)]),
) as TemplatesByLanguage;

function orderFile(): GeneratedFile {
  const generated = generateCode(index, "typescript", templates);
  if (!generated.ok) throw new Error(generated.error.join("\n"));
  const file = sourceFileOf(generated.value, { kind: "aggregate", aggregate: "Order" });
  if (file === undefined) throw new Error("no Order file");
  return file;
}

describe("the code view", () => {
  it("finds the source file of an aggregate, the value objects and the events in every language", () => {
    for (const language of PROGRAMMING_LANGUAGES) {
      const generated = generateCode(index, language, templates);
      if (!generated.ok) throw new Error(generated.error.join("\n"));
      expect(
        sourceFileOf(generated.value, { kind: "aggregate", aggregate: "Order" }),
      ).toBeDefined();
      expect(sourceFileOf(generated.value, { kind: "valueObjects" })).toBeDefined();
      expect(sourceFileOf(generated.value, { kind: "events" })).toBeDefined();
    }
  });

  it("anchors the factory and the repository of an aggregate in every language", () => {
    for (const language of PROGRAMMING_LANGUAGES) {
      const generated = generateCode(index, language, templates);
      if (!generated.ok) throw new Error(generated.error.join("\n"));
      const file = sourceFileOf(generated.value, { kind: "aggregate", aggregate: "Order" });
      const refs = file?.anchors.map((anchor) => anchor.ref) ?? [];
      expect(refs).toContain("Order.factory");
      expect(refs).toContain("Order.repository");
    }
  });

  it("focuses the lines of the anchors with that reference only", () => {
    const file = orderFile();
    const lines = focusedLines(file, "Order.rule.OrderMustHaveLines");

    expect(lines?.size).toBe(1);
    expect(focusedLines(file, null)).toBeNull();
  });

  it("includes the numbered branches of a transition in the focus", () => {
    const file = orderFile();
    const branches = file.anchors.filter((anchor) =>
      /^Order\.transition\.CancelOrder\.\d+$/.test(anchor.ref),
    );

    expect(
      branches.length === 0 || (focusedLines(file, "Order.transition.CancelOrder")?.size ?? 0) > 0,
    ).toBe(true);
  });

  it("names the smallest anchor around a line", () => {
    const file = orderFile();
    const rule = file.anchors.find((anchor) => anchor.ref === "Order.rule.OrderMustHaveLines");

    expect(innermostAnchorAt(file, rule?.startLine ?? 0)?.ref).toBe(
      "Order.rule.OrderMustHaveLines",
    );
  });

  it("lists each reference once, in reading order", () => {
    const refs = anchorsInReadingOrder(orderFile()).map((anchor) => anchor.ref);

    expect(new Set(refs).size).toBe(refs.length);
    expect(refs.indexOf("Order.state.Draft")).toBeLessThan(
      refs.indexOf("Order.command.PlaceOrder"),
    );
  });
});
