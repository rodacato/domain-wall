import { describe, expect, it } from "vitest";
import { loadTemplates } from "../../scripts/lib/loadTemplates";
import type { ProgrammingLanguageId } from "../domain/language/ProgrammingLanguage";
import { buildPackIndex } from "../domain/pack/PackIndex";
import { loadDefaultPack } from "../domain/pack/packFixtures";
import type { GeneratedFile, GeneratedProject } from "./GeneratedProject";
import { generateProject } from "./generateProject";
import { descriptorFor } from "./languages/descriptors";

interface LanguageExpectations {
  readonly language: ProgrammingLanguageId;
  readonly files: readonly string[];
  readonly aggregateFile: string;
  /** How the language spells the error the OrderMustHaveLines rule returns. */
  readonly ruleError: string;
}

const EXPECTATIONS: readonly LanguageExpectations[] = [
  {
    language: "typescript",
    files: [
      "checkout-workflow.test.ts",
      "checkout-workflow.ts",
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
    ],
    aggregateFile: "order.ts",
    ruleError: 'code: "OrderMustHaveLines"',
  },
  {
    language: "python",
    files: [
      "checkout_workflow.py",
      "events.py",
      "invoice.py",
      "listing.py",
      "order.py",
      "result.py",
      "run_tests.py",
      "shipment.py",
      "test_checkout_workflow.py",
      "test_invoice.py",
      "test_listing.py",
      "test_order.py",
      "test_shipment.py",
      "test_value_objects.py",
      "testing.py",
      "value_objects.py",
    ],
    aggregateFile: "order.py",
    ruleError: 'code="OrderMustHaveLines"',
  },
  {
    language: "ruby",
    files: [
      "checkout_workflow.rb",
      "checkout_workflow_test.rb",
      "events.rb",
      "invoice.rb",
      "invoice_test.rb",
      "listing.rb",
      "listing_test.rb",
      "order.rb",
      "order_test.rb",
      "result.rb",
      "run_tests.rb",
      "shipment.rb",
      "shipment_test.rb",
      "testing.rb",
      "value_objects.rb",
      "value_objects_test.rb",
    ],
    aggregateFile: "order.rb",
    ruleError: "reject(:order_must_have_lines)",
  },
  {
    language: "ruby-dry",
    files: [
      "checkout_workflow.rb",
      "checkout_workflow_test.rb",
      "events.rb",
      "invoice.rb",
      "invoice_test.rb",
      "listing.rb",
      "listing_test.rb",
      "order.rb",
      "order_test.rb",
      "run_tests.rb",
      "shipment.rb",
      "shipment_test.rb",
      "testing.rb",
      "types.rb",
      "value_objects.rb",
      "value_objects_test.rb",
    ],
    aggregateFile: "order.rb",
    ruleError: "reject(:order_must_have_lines)",
  },
];

function generateDefaultPack(language: ProgrammingLanguageId): GeneratedProject {
  const descriptor = descriptorFor(language);
  if (descriptor === undefined) throw new Error(`no descriptor for ${language}`);
  const generated = generateProject(
    buildPackIndex(loadDefaultPack()),
    descriptor,
    loadTemplates(language),
  );
  if (!generated.ok) throw new Error(generated.error.join("\n"));
  return generated.value;
}

function fileNamed(project: GeneratedProject, path: string): GeneratedFile {
  const found = project.files.find((file) => file.path === path);
  if (found === undefined) throw new Error(`no generated file ${path}`);
  return found;
}

describe.each(EXPECTATIONS)("generating the default pack in $language", (expectations) => {
  const project = generateDefaultPack(expectations.language);
  const aggregate = fileNamed(project, expectations.aggregateFile);

  it("produces the support files, the shared modules, one module and one test file per aggregate, and the runner", () => {
    expect(project.files.map((file) => file.path).sort()).toEqual([...expectations.files].sort());
  });

  it("reads like hand-written code: the Order aggregate", () => {
    expect(aggregate.content).toMatchSnapshot();
  });

  it("is deterministic", () => {
    expect(generateDefaultPack(expectations.language)).toEqual(project);
  });

  it("anchors each rule to the lines that enforce it", () => {
    const lines = aggregate.content.split("\n");
    const anchor = aggregate.anchors.find(
      (candidate) => candidate.ref === "Order.rule.OrderMustHaveLines",
    );

    expect(anchor).toBeDefined();
    const anchored = lines.slice((anchor?.startLine ?? 1) - 1, anchor?.endLine).join("\n");
    expect(anchored).toContain(expectations.ruleError);
  });

  it("anchors every command, entity, state and invariant of the aggregate", () => {
    const refs = new Set(aggregate.anchors.map((anchor) => anchor.ref));

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
