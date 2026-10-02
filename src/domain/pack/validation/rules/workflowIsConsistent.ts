import { issueAt, type ValidationIssue } from "../../../shared/ValidationIssue";
import type { PackIndex } from "../../PackIndex";
import type { Field } from "../../schema/Field";
import type { IntermediateType } from "../../schema/Workflow";
import { referencesOfExpression } from "../ExpressionReferences";
import type { SemanticRule } from "../SemanticRule";

const RULE_ID = "S12";

/** The workflow is a chain of stages whose types line up and whose stage kinds are used correctly. */
export const workflowIsConsistent: SemanticRule = {
  id: RULE_ID,
  description: "workflow stages chain by type and respect their kind",
  check: (index) => {
    const issues: ValidationIssue[] = [];
    const { workflow } = index.pack;
    const types = new Map<string, IntermediateType>(
      workflow.intermediateTypes.map((type) => [type.codeName, type]),
    );

    workflow.stages.forEach((stage, position) => {
      const at = ["workflow", stage.codeName];
      const next = workflow.stages[position + 1];
      if (next !== undefined && next.input !== stage.output) {
        issues.push(
          issueAt(
            RULE_ID,
            at,
            `outputs "${stage.output}" but the next stage "${next.codeName}" expects "${next.input}"`,
          ),
        );
      }
      const input = types.get(stage.input);
      const output = types.get(stage.output);
      if (input === undefined || output === undefined) return;
      issues.push(...checkStage(index, stage, input, output, types, at));
    });

    const used = new Set<string>(workflow.stages.flatMap((stage) => [stage.input, stage.output]));
    for (const type of workflow.intermediateTypes) {
      if (!used.has(type.codeName))
        issues.push(
          issueAt(
            RULE_ID,
            ["workflow", type.codeName],
            "intermediate type is not used by any stage",
          ),
        );
    }

    const trigger = index.commands.get(workflow.trigger);
    const aggregate = trigger === undefined ? undefined : index.aggregates.get(trigger.handledBy);
    if (aggregate !== undefined) {
      const emitted = new Set<string>(
        aggregate.transitions.flatMap((transition) => transition.emits),
      );
      for (const eventName of workflow.produces) {
        if (!emitted.has(eventName)) {
          issues.push(
            issueAt(
              RULE_ID,
              ["workflow", "produces"],
              `"${aggregate.codeName}" never emits "${eventName}"`,
            ),
          );
        }
      }
    }
    return issues;
  },
};

/** Fields of a type including everything inherited through `extends`, parents first. */
function resolvedFields(
  type: IntermediateType,
  types: ReadonlyMap<string, IntermediateType>,
  seen = new Set<string>(),
): Field[] {
  if (seen.has(type.codeName)) return [];
  seen.add(type.codeName);
  const parent = type.extends === null ? undefined : types.get(type.extends);
  return [...(parent === undefined ? [] : resolvedFields(parent, types, seen)), ...type.fields];
}

function checkStage(
  index: PackIndex,
  stage: PackIndex["pack"]["workflow"]["stages"][number],
  input: IntermediateType,
  output: IntermediateType,
  types: ReadonlyMap<string, IntermediateType>,
  at: readonly string[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const inputFields = new Map<string, Field["type"]>(
    resolvedFields(input, types).map((field) => [field.codeName, field.type]),
  );
  const outputFields = resolvedFields(output, types);

  if (stage.kind.type === "validate") {
    for (const field of outputFields) {
      const rawType = inputFields.get(field.codeName);
      const valueObject =
        field.type.kind === "valueObject" ? index.valueObjects.get(field.type.ref) : undefined;
      if (rawType === undefined) {
        issues.push(
          issueAt(
            RULE_ID,
            at,
            `validated field "${field.codeName}" has no raw counterpart in "${input.codeName}"`,
          ),
        );
      } else if (valueObject?.kind === "scalar" || valueObject?.kind === "enum") {
        const expectedName = valueObject.kind === "scalar" ? valueObject.base : "string";
        if (rawType.kind !== "primitive" || rawType.name !== expectedName) {
          issues.push(
            issueAt(
              RULE_ID,
              at,
              `raw field "${field.codeName}" must be a ${expectedName} to build ${valueObject.codeName}`,
            ),
          );
        }
      } else {
        issues.push(
          issueAt(
            RULE_ID,
            at,
            `validate stages can only build scalar or enum value objects; "${field.codeName}" is something else`,
          ),
        );
      }
    }
    return issues;
  }

  if (output.extends !== input.codeName) {
    issues.push(
      issueAt(
        RULE_ID,
        at,
        `"${output.codeName}" must extend "${input.codeName}" because the ${stage.kind.type} stage only adds data`,
      ),
    );
  }
  if (stage.kind.type === "compute") {
    const added = new Set<string>(output.fields.map((field) => field.codeName));
    const assigned = new Set<string>(stage.kind.assigns.map((assign) => assign.field));
    for (const name of added)
      if (!assigned.has(name))
        issues.push(issueAt(RULE_ID, at, `added field "${name}" is not computed`));
    for (const name of assigned)
      if (!added.has(name))
        issues.push(
          issueAt(RULE_ID, at, `computed field "${name}" is not declared on "${output.codeName}"`),
        );
    for (const assign of stage.kind.assigns) {
      const references = referencesOfExpression(assign.expression);
      for (const name of references.aggregateFields) {
        if (!inputFields.has(name))
          issues.push(
            issueAt(
              RULE_ID,
              at,
              `expression reads "${name}", which "${input.codeName}" does not have`,
            ),
          );
      }
      if (references.arguments.size > 0)
        issues.push(issueAt(RULE_ID, at, "workflow expressions cannot read command arguments"));
    }
  }
  return issues;
}
