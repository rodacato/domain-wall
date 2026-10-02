import { issueAt, type ValidationIssue } from "../../../shared/ValidationIssue";
import type { PackIndex } from "../../PackIndex";
import type { Expression, Predicate } from "../../schema/Expression";
import type { FieldType } from "../../schema/FieldType";
import type { SemanticRule } from "../SemanticRule";

const RULE_ID = "S01";

/** Every reference must resolve to a concept of the right kind. */
export const referencesResolve: SemanticRule = {
  id: RULE_ID,
  description: "all references resolve to a concept of the right kind",
  check: (index) => {
    const issues: ValidationIssue[] = [];
    const missing = (path: readonly string[], kind: string, name: string): void => {
      issues.push(issueAt(RULE_ID, path, `${kind} "${name}" does not exist`));
    };
    const requireIn = (
      table: ReadonlyMap<string, unknown>,
      kind: string,
      path: readonly string[],
      name: string,
    ): void => {
      if (!table.has(name)) missing(path, kind, name);
    };
    const { pack } = index;

    const checkType = (type: FieldType, path: readonly string[]): void => {
      switch (type.kind) {
        case "primitive":
          return;
        case "valueObject": {
          requireIn(index.valueObjects, "value object", path, type.ref);
          return;
        }
        case "entity": {
          requireIn(index.entities, "entity", path, type.ref);
          return;
        }
        case "list":
        case "optional": {
          checkType(type.of, path);
          return;
        }
      }
    };

    for (const event of pack.events) {
      requireIn(index.contexts, "context", ["events", event.codeName, "context"], event.context);
      for (const field of event.payload)
        checkType(field.type, ["events", event.codeName, field.codeName]);
    }

    for (const command of pack.commands) {
      const at = ["commands", command.codeName];
      requireIn(index.contexts, "context", [...at, "context"], command.context);
      requireIn(index.aggregates, "aggregate", [...at, "handledBy"], command.handledBy);
      const issuerTable = {
        actor: index.actors,
        policy: index.policies,
        externalSystem: index.externalSystems,
      }[command.issuedBy.kind];
      requireIn(issuerTable, command.issuedBy.kind, [...at, "issuedBy"], command.issuedBy.ref);
      for (const param of command.params) checkType(param.type, [...at, param.codeName]);
    }

    for (const policy of pack.policies) {
      const at = ["policies", policy.codeName];
      requireIn(index.contexts, "context", [...at, "context"], policy.context);
      requireIn(index.events, "event", [...at, "when"], policy.when);
      requireIn(index.commands, "command", [...at, "then"], policy.then);
    }

    for (const readModel of pack.readModels) {
      const at = ["readModels", readModel.codeName];
      requireIn(index.contexts, "context", [...at, "context"], readModel.context);
      for (const field of readModel.fields) checkType(field.type, [...at, field.codeName]);
      for (const eventName of readModel.fedBy)
        requireIn(index.events, "event", [...at, "fedBy"], eventName);
      for (const actorName of readModel.usedBy)
        requireIn(index.actors, "actor", [...at, "usedBy"], actorName);
    }

    for (const valueObject of pack.valueObjects) {
      if (valueObject.kind !== "record") continue;
      for (const field of valueObject.fields) {
        checkType(field.type, ["valueObjects", valueObject.codeName, field.codeName]);
      }
    }

    for (const aggregate of pack.aggregates) {
      issues.push(...checkAggregateReferences(index, aggregate, checkType, requireIn));
    }

    issues.push(...checkStrategyReferences(index, requireIn));
    issues.push(...checkWorkflowReferences(index, checkType, requireIn));
    issues.push(...checkDialogueReferences(index, requireIn));
    return issues;
  },
};

type TableCheck = (
  table: ReadonlyMap<string, unknown>,
  kind: string,
  path: readonly string[],
  name: string,
) => void;
type TypeCheck = (type: FieldType, path: readonly string[]) => void;

function checkAggregateReferences(
  index: PackIndex,
  aggregate: PackIndex["pack"]["aggregates"][number],
  checkType: TypeCheck,
  requireIn: TableCheck,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const at = ["aggregates", aggregate.codeName];
  const stateNames = new Set<string>(aggregate.states.map((state) => state.codeName));
  const ruleNames = new Set<string>(aggregate.rules.map((rule) => rule.codeName));
  const fieldNames = new Set<string>([
    ...aggregate.fields.map((field) => field.codeName),
    ...aggregate.derived.map((field) => field.codeName),
    ...aggregate.states.flatMap((state) => state.data.map((field) => field.codeName)),
  ]);

  requireIn(index.contexts, "context", [...at, "context"], aggregate.context);
  if (!aggregate.fields.some((field) => field.codeName === aggregate.identity)) {
    issues.push(
      issueAt(
        RULE_ID,
        [...at, "identity"],
        `identity "${aggregate.identity}" is not one of the fields`,
      ),
    );
  }
  for (const field of [
    ...aggregate.fields,
    ...aggregate.derived,
    ...aggregate.states.flatMap((s) => s.data),
  ]) {
    checkType(field.type, [...at, "fields", field.codeName]);
  }
  for (const entity of aggregate.entities) {
    if (!entity.fields.some((field) => field.codeName === entity.identity)) {
      issues.push(
        issueAt(
          RULE_ID,
          [...at, "entities", entity.codeName],
          `identity "${entity.identity}" is not one of its fields`,
        ),
      );
    }
    for (const field of entity.fields)
      checkType(field.type, [...at, "entities", entity.codeName, field.codeName]);
  }
  if (!stateNames.has(aggregate.initialState)) {
    issues.push(
      issueAt(RULE_ID, [...at, "initialState"], `state "${aggregate.initialState}" does not exist`),
    );
  }
  for (const invariant of aggregate.invariants) {
    if (!ruleNames.has(invariant))
      issues.push(issueAt(RULE_ID, [...at, "invariants"], `rule "${invariant}" does not exist`));
  }
  for (const transition of aggregate.transitions) {
    const transitionPath = [...at, "transitions", transition.command];
    requireIn(index.commands, "command", transitionPath, transition.command);
    for (const stateName of [...transition.from, transition.to]) {
      if (!stateNames.has(stateName))
        issues.push(issueAt(RULE_ID, transitionPath, `state "${stateName}" does not exist`));
    }
    for (const guard of transition.guards) {
      if (!ruleNames.has(guard))
        issues.push(issueAt(RULE_ID, transitionPath, `guard rule "${guard}" does not exist`));
    }
    for (const eventName of transition.emits)
      requireIn(index.events, "event", transitionPath, eventName);
    for (const effect of transition.effects) {
      if (!fieldNames.has(effect.field))
        issues.push(
          issueAt(RULE_ID, transitionPath, `effect targets unknown field "${effect.field}"`),
        );
      issues.push(...expressionReferences(index, effect.value, transitionPath));
    }
  }
  for (const rule of aggregate.rules) {
    issues.push(...predicateReferences(index, rule.predicate, [...at, "rules", rule.codeName]));
  }
  for (const derived of aggregate.derived) {
    issues.push(
      ...expressionReferences(index, derived.expression, [...at, "derived", derived.codeName]),
    );
  }
  return issues;
}

function expressionReferences(
  index: PackIndex,
  expression: Expression,
  path: readonly string[],
): ValidationIssue[] {
  switch (expression.op) {
    case "literal":
    case "field":
    case "arg":
      return [];
    case "count":
      return expressionReferences(index, expression.collection, path);
    case "sumOf":
      return [
        ...expressionReferences(index, expression.collection, path),
        ...expressionReferences(index, expression.term, path),
      ];
    case "arithmetic":
      return [
        ...expressionReferences(index, expression.left, path),
        ...expressionReferences(index, expression.right, path),
      ];
    case "construct": {
      const known = index.entities.has(expression.type) || index.valueObjects.has(expression.type);
      const own = known
        ? []
        : [issueAt(RULE_ID, path, `constructed type "${expression.type}" does not exist`)];
      return [
        ...own,
        ...expression.fields.flatMap((field) => expressionReferences(index, field.value, path)),
      ];
    }
  }
}

function predicateReferences(
  index: PackIndex,
  predicate: Predicate,
  path: readonly string[],
): ValidationIssue[] {
  switch (predicate.kind) {
    case "compare":
      return [
        ...expressionReferences(index, predicate.left, path),
        ...expressionReferences(index, predicate.right, path),
      ];
    case "present":
    case "notEmpty":
      return expressionReferences(index, predicate.value, path);
    case "all":
    case "any":
      return predicate.of.flatMap((inner) => predicateReferences(index, inner, path));
    case "not":
      return predicateReferences(index, predicate.of, path);
  }
}

function checkStrategyReferences(index: PackIndex, requireIn: TableCheck): ValidationIssue[] {
  const { pack } = index;
  const issues: ValidationIssue[] = [];
  const conceptExists = (name: string): boolean =>
    index.aggregates.has(name) || index.entities.has(name) || index.valueObjects.has(name);

  pack.contextRelations.forEach((relation, position) => {
    const at = ["contextRelations", String(position)];
    const contextNames =
      relation.type === "upstreamDownstream"
        ? [relation.upstream, relation.downstream]
        : [relation.a, relation.b];
    for (const contextName of contextNames) requireIn(index.contexts, "context", at, contextName);
    if (relation.type === "upstreamDownstream") {
      for (const eventName of relation.via) requireIn(index.events, "event", at, eventName);
    } else if (relation.type === "partnership" || relation.type === "sharedKernel") {
      for (const sharedName of relation.shared)
        requireIn(index.valueObjects, "value object", at, sharedName);
    }
  });

  for (const meaning of pack.ambiguousTerm.meanings) {
    const at = ["ambiguousTerm", meaning.context];
    requireIn(index.contexts, "context", at, meaning.context);
    if (!conceptExists(meaning.concept))
      issues.push(issueAt(RULE_ID, at, `concept "${meaning.concept}" does not exist`));
  }

  const acl = pack.antiCorruptionLayer;
  const aclPath = ["antiCorruptionLayer"];
  requireIn(index.contexts, "context", aclPath, acl.context);
  requireIn(index.externalSystems, "external system", aclPath, acl.externalSystem);
  requireIn(index.aggregates, "aggregate", aclPath, acl.domainType);
  if (!acl.externalTypes.some((type) => type.codeName === acl.externalRoot)) {
    issues.push(
      issueAt(
        RULE_ID,
        aclPath,
        `external root "${acl.externalRoot}" is not declared in externalTypes`,
      ),
    );
  }
  return issues;
}

function checkWorkflowReferences(
  index: PackIndex,
  checkType: TypeCheck,
  requireIn: TableCheck,
): ValidationIssue[] {
  const { workflow } = index.pack;
  const issues: ValidationIssue[] = [];
  const at = ["workflow"];
  requireIn(index.commands, "command", [...at, "trigger"], workflow.trigger);
  const typeNames = new Set<string>(workflow.intermediateTypes.map((type) => type.codeName));
  for (const type of workflow.intermediateTypes) {
    if (type.extends !== null && !typeNames.has(type.extends)) {
      issues.push(
        issueAt(RULE_ID, [...at, type.codeName], `extends unknown type "${type.extends}"`),
      );
    }
    for (const field of type.fields) checkType(field.type, [...at, type.codeName, field.codeName]);
  }
  for (const stage of workflow.stages) {
    for (const typeName of [stage.input, stage.output]) {
      if (!typeNames.has(typeName))
        issues.push(
          issueAt(
            RULE_ID,
            [...at, stage.codeName],
            `type "${typeName}" is not an intermediate type`,
          ),
        );
    }
  }
  for (const eventName of workflow.produces)
    requireIn(index.events, "event", [...at, "produces"], eventName);
  return issues;
}

function checkDialogueReferences(index: PackIndex, requireIn: TableCheck): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const [slot, lines] of Object.entries(index.pack.dialogues)) {
    lines.forEach((line, position) => {
      requireIn(index.experts, "expert", ["dialogues", slot, String(position)], line.speaker);
    });
  }
  return issues;
}
