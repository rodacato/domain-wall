import { issueAt, type ValidationIssue } from "../../../shared/ValidationIssue";
import type { SemanticRule } from "../SemanticRule";

const RULE_ID = "S06";

/**
 * Every top-level concept name is unique across the whole pack, so a name identifies exactly one
 * concept (dialogue term references and generated modules rely on it). Error codes share one
 * namespace of their own that must not collide with concept names either, because some languages
 * generate a class per error.
 */
export const codeNamesAreUnique: SemanticRule = {
  id: RULE_ID,
  description: "code names are unique across the pack",
  check: ({ pack }) => {
    const issues: ValidationIssue[] = [];
    const seen = new Map<string, string>();
    const claim = (name: string, owner: string, path: readonly string[]): void => {
      const previous = seen.get(name);
      if (previous !== undefined) {
        issues.push(issueAt(RULE_ID, path, `"${name}" is already used by ${previous}`));
        return;
      }
      seen.set(name, owner);
    };

    claim(pack.business.codeName, "the business", ["business", "codeName"]);
    claim(pack.ambiguousTerm.codeName, "the ambiguous term", ["ambiguousTerm", "codeName"]);
    for (const expert of pack.experts)
      claim(expert.codeName, "an expert", ["experts", expert.codeName]);
    for (const actor of pack.actors) claim(actor.codeName, "an actor", ["actors", actor.codeName]);
    for (const system of pack.externalSystems)
      claim(system.codeName, "an external system", ["externalSystems", system.codeName]);
    for (const context of pack.contexts)
      claim(context.codeName, "a context", ["contexts", context.codeName]);
    for (const policy of pack.policies)
      claim(policy.codeName, "a policy", ["policies", policy.codeName]);
    for (const event of pack.events) claim(event.codeName, "an event", ["events", event.codeName]);
    for (const command of pack.commands)
      claim(command.codeName, "a command", ["commands", command.codeName]);
    for (const readModel of pack.readModels)
      claim(readModel.codeName, "a read model", ["readModels", readModel.codeName]);
    for (const valueObject of pack.valueObjects) {
      claim(valueObject.codeName, "a value object", ["valueObjects", valueObject.codeName]);
    }
    for (const aggregate of pack.aggregates) {
      claim(aggregate.codeName, "an aggregate", ["aggregates", aggregate.codeName]);
      for (const entity of aggregate.entities) {
        claim(entity.codeName, "an entity", [
          "aggregates",
          aggregate.codeName,
          "entities",
          entity.codeName,
        ]);
      }
    }
    for (const type of pack.workflow.intermediateTypes) {
      claim(type.codeName, "a workflow type", ["workflow", type.codeName]);
    }
    claim(pack.workflow.codeName, "the workflow", ["workflow", "codeName"]);
    for (const stage of pack.workflow.stages) {
      claim(stage.codeName, "a workflow stage", ["workflow", stage.codeName]);
      if (stage.kind.type === "callPort")
        claim(stage.kind.port.codeName, "a port", ["workflow", stage.codeName]);
    }
    for (const type of pack.antiCorruptionLayer.externalTypes) {
      claim(type.codeName, "an external type", ["antiCorruptionLayer", type.codeName]);
    }

    const errorCodes = new Map<string, string>();
    const claimError = (code: string, owner: string, path: readonly string[]): void => {
      if (seen.has(code)) {
        issues.push(
          issueAt(
            RULE_ID,
            path,
            `error code "${code}" collides with the concept name used by ${seen.get(code) ?? "another concept"}`,
          ),
        );
        return;
      }
      const previous = errorCodes.get(code);
      if (previous !== undefined) {
        issues.push(issueAt(RULE_ID, path, `error code "${code}" is already used by ${previous}`));
        return;
      }
      errorCodes.set(code, owner);
    };
    for (const aggregate of pack.aggregates) {
      for (const rule of aggregate.rules) {
        claimError(rule.codeName, `rule of ${aggregate.codeName}`, [
          "aggregates",
          aggregate.codeName,
          "rules",
          rule.codeName,
        ]);
      }
    }
    for (const valueObject of pack.valueObjects) {
      if (valueObject.kind !== "scalar") continue;
      for (const constraint of valueObject.constraints) {
        claimError(constraint.errorCode, `constraint of ${valueObject.codeName}`, [
          "valueObjects",
          valueObject.codeName,
          constraint.errorCode,
        ]);
      }
    }
    for (const stage of pack.workflow.stages) {
      for (const error of stage.errors)
        claimError(error.codeName, `stage ${stage.codeName}`, [
          "workflow",
          stage.codeName,
          error.codeName,
        ]);
    }

    for (const aggregate of pack.aggregates) {
      issues.push(
        ...duplicatesWithin(
          aggregate.states.map((state) => state.codeName),
          ["aggregates", aggregate.codeName, "states"],
          "state",
        ),
      );
      issues.push(
        ...duplicatesWithin(
          aggregate.rules.map((rule) => rule.codeName),
          ["aggregates", aggregate.codeName, "rules"],
          "rule",
        ),
      );
      const memberNames = [
        ...aggregate.fields.map((field) => field.codeName),
        ...aggregate.derived.map((field) => field.codeName),
        ...aggregate.states.flatMap((state) => state.data.map((field) => field.codeName)),
      ];
      issues.push(...duplicatesWithin(memberNames, ["aggregates", aggregate.codeName], "member"));
    }
    for (const command of pack.commands) {
      issues.push(
        ...duplicatesWithin(
          command.params.map((param) => param.codeName),
          ["commands", command.codeName],
          "parameter",
        ),
      );
    }
    for (const event of pack.events) {
      issues.push(
        ...duplicatesWithin(
          event.payload.map((field) => field.codeName),
          ["events", event.codeName],
          "payload field",
        ),
      );
    }
    return issues;
  },
};

function duplicatesWithin(
  names: readonly string[],
  path: readonly string[],
  kind: string,
): ValidationIssue[] {
  const seen = new Set<string>();
  const issues: ValidationIssue[] = [];
  for (const name of names) {
    if (seen.has(name))
      issues.push(issueAt(RULE_ID, path, `${kind} "${name}" is declared more than once`));
    seen.add(name);
  }
  return issues;
}
