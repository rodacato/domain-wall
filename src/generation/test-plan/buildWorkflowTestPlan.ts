import type { PackIndex } from "../../domain/pack/PackIndex";
import type { Expression } from "../../domain/pack/schema/Expression";
import type { FieldType } from "../../domain/pack/schema/FieldType";
import type { Literal } from "../../domain/pack/schema/Literal";
import { portOfStage, shapeWorkflow, type ShapedStage } from "../../domain/pack/workflowShape";
import { buildValueObjectTestPlans } from "./buildTestPlan";
import type {
  PlannedField,
  PortFailureTest,
  PortReceipt,
  ValidationFailureTest,
  WorkflowTestPlan,
} from "./WorkflowTestPlan";

const FALLBACK_TEXT = "sample";
const NOT_A_MEMBER = "NotAMember";

function sampleOf(index: PackIndex, type: FieldType): Literal {
  if (type.kind === "primitive") return type.name === "integer" ? 1 : FALLBACK_TEXT;
  if (type.kind !== "valueObject") return FALLBACK_TEXT;
  const plan = buildValueObjectTestPlans(index).find(
    (candidate) => candidate.valueObject === type.ref,
  );
  if (plan !== undefined) return plan.valid[0] ?? FALLBACK_TEXT;
  const declared = index.valueObjects.get(type.ref);
  return declared?.kind === "enum"
    ? (declared.members[0]?.codeName ?? FALLBACK_TEXT)
    : FALLBACK_TEXT;
}

/** Works out a stage expression over plain numbers; undefined when it needs anything else. */
function evaluate(
  expression: Expression,
  values: ReadonlyMap<string, Literal>,
): number | undefined {
  switch (expression.op) {
    case "literal":
      return typeof expression.value === "number" ? expression.value : undefined;
    case "field": {
      const value = values.get(expression.name);
      return typeof value === "number" ? value : undefined;
    }
    case "arithmetic": {
      const left = evaluate(expression.left, values);
      const right = evaluate(expression.right, values);
      if (left === undefined || right === undefined) return undefined;
      if (expression.operator === "add") return left + right;
      if (expression.operator === "subtract") return left - right;
      return left * right;
    }
    case "arg":
    case "count":
    case "sumOf":
    case "construct":
      return undefined;
  }
}

function invalidExampleOf(index: PackIndex, valueObject: string): Literal | undefined {
  const declared = index.valueObjects.get(valueObject);
  if (declared?.kind === "enum") return NOT_A_MEMBER;
  return buildValueObjectTestPlans(index)
    .find((candidate) => candidate.valueObject === valueObject)
    ?.constraints.flatMap((constraint) => constraint.invalidExamples)[0];
}

function validationFailures(
  index: PackIndex,
  entry: ShapedStage,
): readonly ValidationFailureTest[] {
  const code = entry.stage.errors[0]?.codeName;
  if (entry.stage.kind.type !== "validate" || code === undefined) return [];
  return entry.output.fields.flatMap((field) => {
    if (field.type.kind !== "valueObject") return [];
    const value = invalidExampleOf(index, field.type.ref);
    return value === undefined
      ? []
      : [{ stage: entry.stage.codeName, field: field.codeName, value, code }];
  });
}

/** What to verify about the pack's workflow, worked out from the value objects' examples and the stage expressions. */
export function buildWorkflowTestPlan(index: PackIndex): WorkflowTestPlan | undefined {
  const stages = shapeWorkflow(index);
  const first = stages[0];
  if (first === undefined) return undefined;

  const validated = stages.find((entry) => entry.stage.kind.type === "validate")?.output;
  const targetTypes = new Map(validated?.fields.map((field) => [field.codeName, field.type]));
  const input: PlannedField[] = first.input.fields.map((field) => ({
    name: field.codeName,
    type: field.type,
    value: sampleOf(index, targetTypes.get(field.codeName) ?? field.type),
  }));
  const values = new Map<string, Literal>(input.map((field) => [field.name, field.value]));

  const computed: PlannedField[] = [];
  const receipts: PortReceipt[] = [];
  for (const entry of stages) {
    const { kind } = entry.stage;
    if (kind.type === "compute") {
      for (const assign of kind.assigns) {
        const value = evaluate(assign.expression, values);
        const field = entry.output.fields.find((candidate) => candidate.codeName === assign.field);
        if (value === undefined || field === undefined) continue;
        computed.push({ name: assign.field, type: field.type, value });
        values.set(assign.field, value);
      }
    }
    const port = portOfStage(entry.stage);
    if (port !== undefined) {
      const fields = entry.output.fields
        .filter((field) => entry.output.added.includes(field.codeName))
        .map((field) => ({
          name: field.codeName,
          type: field.type,
          value: sampleOf(index, field.type),
        }));
      receipts.push({ port: port.name, fields });
    }
  }

  const portFailures: PortFailureTest[] = stages.flatMap((entry) => {
    const port = portOfStage(entry.stage);
    return port === undefined
      ? []
      : entry.stage.errors.map((error) => ({
          stage: entry.stage.codeName,
          code: error.codeName,
          failingPort: port.name,
        }));
  });

  return {
    input,
    receipts,
    computed,
    validationFailures: stages.flatMap((entry) => validationFailures(index, entry)),
    portFailures,
  };
}
