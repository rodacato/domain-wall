import { issueAt, type ValidationIssue } from "../../../shared/ValidationIssue";
import type { PackIndex } from "../../PackIndex";
import type { Aggregate } from "../../schema/Aggregate";
import type { Expression, Predicate } from "../../schema/Expression";
import type { FieldType } from "../../schema/FieldType";
import type { SemanticRule } from "../SemanticRule";

const RULE_ID = "S21";

interface Scope {
  /** Names `field` may read at this level. */
  readonly fieldNames: ReadonlySet<string>;
  /** Declared types of readable fields, used to find collection element types. */
  readonly fieldTypes: ReadonlyMap<string, FieldType>;
  /** Parameter names (and types) `arg` may read; null when arguments are not available. */
  readonly parameters: ReadonlyMap<string, FieldType> | null;
}

/** Expressions only read names that exist in the scope where they run. */
export const expressionsAreWellScoped: SemanticRule = {
  id: RULE_ID,
  description: "expressions read only fields and arguments that exist where they are evaluated",
  check: (index) => {
    const issues: ValidationIssue[] = [];
    for (const aggregate of index.pack.aggregates) {
      const at = ["aggregates", aggregate.codeName];
      const aggregateScope = scopeOfAggregate(aggregate, null);

      for (const derived of aggregate.derived) {
        issues.push(
          ...checkExpression(index, derived.expression, aggregateScope, [
            ...at,
            "derived",
            derived.codeName,
          ]),
        );
      }
      for (const entity of aggregate.entities) {
        const entityScope: Scope = scopeOfFields([...entity.fields, ...entity.derived], null);
        for (const derived of entity.derived) {
          issues.push(
            ...checkExpression(index, derived.expression, entityScope, [
              ...at,
              "entities",
              entity.codeName,
              derived.codeName,
            ]),
          );
        }
      }

      const invariantNames = new Set<string>(aggregate.invariants);
      for (const rule of aggregate.rules) {
        if (invariantNames.has(rule.codeName)) {
          issues.push(
            ...checkPredicate(index, rule.predicate, aggregateScope, [
              ...at,
              "rules",
              rule.codeName,
            ]),
          );
        }
      }
      for (const transition of aggregate.transitions) {
        const command = index.commands.get(transition.command);
        if (command === undefined) continue;
        const scope = scopeOfAggregate(
          aggregate,
          new Map(command.params.map((param) => [param.codeName, param.type])),
        );
        const transitionPath = [...at, "transitions", transition.command];
        for (const guardName of transition.guards) {
          const rule = aggregate.rules.find((candidate) => candidate.codeName === guardName);
          if (rule !== undefined)
            issues.push(
              ...checkPredicate(index, rule.predicate, scope, [...transitionPath, guardName]),
            );
        }
        for (const effect of transition.effects) {
          issues.push(
            ...checkExpression(index, effect.value, scope, [...transitionPath, effect.field]),
          );
        }
      }
    }
    return issues;
  },
};

function scopeOfAggregate(
  aggregate: Aggregate,
  parameters: ReadonlyMap<string, FieldType> | null,
): Scope {
  return scopeOfFields(
    [...aggregate.fields, ...aggregate.derived, ...aggregate.states.flatMap((state) => state.data)],
    parameters,
  );
}

function scopeOfFields(
  fields: readonly { readonly codeName: string; readonly type: FieldType }[],
  parameters: ReadonlyMap<string, FieldType> | null,
): Scope {
  return {
    fieldNames: new Set(fields.map((field) => field.codeName)),
    fieldTypes: new Map(fields.map((field) => [field.codeName, field.type])),
    parameters,
  };
}

function checkPredicate(
  index: PackIndex,
  predicate: Predicate,
  scope: Scope,
  path: readonly string[],
): ValidationIssue[] {
  switch (predicate.kind) {
    case "compare":
      return [
        ...checkExpression(index, predicate.left, scope, path),
        ...checkExpression(index, predicate.right, scope, path),
      ];
    case "present":
    case "notEmpty":
      return checkExpression(index, predicate.value, scope, path);
    case "all":
    case "any":
      return predicate.of.flatMap((inner) => checkPredicate(index, inner, scope, path));
    case "not":
      return checkPredicate(index, predicate.of, scope, path);
  }
}

function checkExpression(
  index: PackIndex,
  expression: Expression,
  scope: Scope,
  path: readonly string[],
): ValidationIssue[] {
  switch (expression.op) {
    case "literal":
      return [];
    case "field":
      return scope.fieldNames.has(expression.name)
        ? []
        : [issueAt(RULE_ID, path, `field "${expression.name}" does not exist here`)];
    case "arg":
      if (scope.parameters === null)
        return [
          issueAt(
            RULE_ID,
            path,
            `argument "${expression.name}" is not available here (invariants and derived values cannot read arguments)`,
          ),
        ];
      return scope.parameters.has(expression.name)
        ? []
        : [issueAt(RULE_ID, path, `the command has no parameter "${expression.name}"`)];
    case "count":
      return checkExpression(index, expression.collection, scope, path);
    case "arithmetic":
      return [
        ...checkExpression(index, expression.left, scope, path),
        ...checkExpression(index, expression.right, scope, path),
      ];
    case "sumOf": {
      const collectionIssues = checkExpression(index, expression.collection, scope, path);
      const elementScope = scopeOfElement(index, expression.collection, scope);
      if (elementScope === null)
        return [
          ...collectionIssues,
          issueAt(RULE_ID, path, "sumOf needs a list of entities or record value objects"),
        ];
      return [...collectionIssues, ...checkExpression(index, expression.term, elementScope, path)];
    }
    case "construct": {
      const entity = index.entities.get(expression.type)?.entity;
      const record = index.valueObjects.get(expression.type);
      const expected = entity?.fields ?? (record?.kind === "record" ? record.fields : undefined);
      if (expected === undefined)
        return [issueAt(RULE_ID, path, `"${expression.type}" cannot be constructed`)];
      const expectedNames = new Set<string>(expected.map((field) => field.codeName));
      const givenNames = new Set<string>(expression.fields.map((field) => field.name));
      const issues: ValidationIssue[] = [];
      for (const name of expectedNames)
        if (!givenNames.has(name))
          issues.push(
            issueAt(RULE_ID, path, `constructing "${expression.type}" is missing "${name}"`),
          );
      for (const name of givenNames)
        if (!expectedNames.has(name))
          issues.push(issueAt(RULE_ID, path, `"${expression.type}" has no field "${name}"`));
      return [
        ...issues,
        ...expression.fields.flatMap((field) => checkExpression(index, field.value, scope, path)),
      ];
    }
  }
}

function scopeOfElement(index: PackIndex, collection: Expression, scope: Scope): Scope | null {
  const type =
    collection.op === "field"
      ? scope.fieldTypes.get(collection.name)
      : collection.op === "arg"
        ? scope.parameters?.get(collection.name)
        : undefined;
  if (type?.kind !== "list") return null;
  const element = type.of;
  if (element.kind === "entity") {
    const entity = index.entities.get(element.ref)?.entity;
    return entity === undefined ? null : scopeOfFields([...entity.fields, ...entity.derived], null);
  }
  if (element.kind === "valueObject") {
    const valueObject = index.valueObjects.get(element.ref);
    return valueObject?.kind === "record" ? scopeOfFields(valueObject.fields, null) : null;
  }
  return null;
}
