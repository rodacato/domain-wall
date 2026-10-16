import { describe, expect, it } from "vitest";
import { loadTemplates } from "../../scripts/lib/loadTemplates";
import { buildPackIndex } from "../domain/pack/PackIndex";
import { loadDefaultPack } from "../domain/pack/packFixtures";
import type { GeneratedFile, GeneratedProject } from "./GeneratedProject";
import { generateProject } from "./generateProject";
import { typescriptDescriptor } from "./languages/typescript/typescriptDescriptor";

function generateDefaultPack(): GeneratedProject {
  const generated = generateProject(
    buildPackIndex(loadDefaultPack()),
    typescriptDescriptor,
    loadTemplates("typescript"),
  );
  if (!generated.ok) throw new Error(generated.error.join("\n"));
  return generated.value;
}

function fileNamed(project: GeneratedProject, path: string): GeneratedFile {
  const found = project.files.find((file) => file.path === path);
  if (found === undefined) throw new Error(`no generated file ${path}`);
  return found;
}

const project = generateDefaultPack();

describe("generating the default pack in TypeScript", () => {
  it("produces the support files, the shared modules, one module and one test file per aggregate, and the runner", () => {
    expect(project.files.map((file) => file.path).sort()).toEqual(
      [
        "events.ts",
        "invoice.test.ts",
        "invoice.ts",
        "listing.test.ts",
        "listing.ts",
        "order.test.ts",
        "order.ts",
        "result.ts",
        "run-tests.ts",
        "shipment.test.ts",
        "shipment.ts",
        "testing.ts",
        "value-objects.test.ts",
        "value-objects.ts",
      ].sort(),
    );
  });

  it("reads like hand-written code: the Order aggregate", () => {
    expect(fileNamed(project, "order.ts").content).toMatchSnapshot();
  });

  it("is deterministic", () => {
    expect(generateDefaultPack()).toEqual(project);
  });

  it("anchors each rule to the line that enforces it", () => {
    const order = fileNamed(project, "order.ts");
    const lines = order.content.split("\n");
    const anchor = order.anchors.find(
      (candidate) => candidate.ref === "Order.rule.OrderMustHaveLines",
    );

    expect(anchor).toBeDefined();
    expect(lines[(anchor?.startLine ?? 1) - 1]).toContain('code: "OrderMustHaveLines"');
    expect(anchor?.startLine).toBe(anchor?.endLine);
  });

  it("anchors every command, entity, state and invariant of the aggregate", () => {
    const refs = new Set(fileNamed(project, "order.ts").anchors.map((anchor) => anchor.ref));

    for (const expected of [
      "Order",
      "Order.command.PlaceOrder",
      "Order.entity.OrderLine",
      "Order.state.Draft",
      "Order.invariant.OrderLinesWithinLimit",
      "Order.transition.PlaceOrder",
    ]) {
      expect(refs.has(expected)).toBe(true);
    }
  });

  it("leaves no anchor markers or unfilled template tags in any file", () => {
    for (const file of project.files) {
      expect(file.content).not.toMatch(/⟦|⟧|\{\{|\}\}/);
    }
  });
});
