import type { PackIndex } from "../PackIndex";
import { err, ok, type Result } from "../../shared/Result";
import type { Expression } from "../schema/Expression";
import type { FieldType } from "../schema/FieldType";
import type { TypeName } from "../naming/CodeName";
import type { EvaluationScope } from "./EvaluationScope";
import { isValueRecord, type Value, type ValueRecord } from "./Value";

const MAXIMUM_DERIVATION_DEPTH = 16;

export function evaluateExpression(
  index: PackIndex,
  scope: EvaluationScope,
  expression: Expression,
  depth = 0,
): Result<Value, string> {
  if (depth > MAXIMUM_DERIVATION_DEPTH)
    return err("expression nesting is too deep (cyclic derived field?)");
  switch (expression.op) {
    case "literal":
      return ok(expression.value);
    case "field":
      return readField(index, scope, expression.name, depth);
    case "arg": {
      const value = scope.args[expression.name];
      return value === undefined ? err(`unknown argument ${expression.name}`) : ok(value);
    }
    case "count": {
      const collection = evaluateExpression(index, scope, expression.collection, depth + 1);
      if (!collection.ok) return collection;
      return Array.isArray(collection.value)
        ? ok(collection.value.length)
        : err("count needs a list");
    }
    case "sumOf":
      return sumOf(index, scope, expression, depth);
    case "arithmetic":
      return arithmetic(index, scope, expression, depth);
    case "construct": {
      const built: Record<string, Value> = {};
      for (const field of expression.fields) {
        const value = evaluateExpression(index, scope, field.value, depth + 1);
        if (!value.ok) return value;
        built[field.name] = value.value;
      }
      return ok(built);
    }
  }
}

export function evaluateInteger(
  index: PackIndex,
  scope: EvaluationScope,
  expression: Expression,
  depth = 0,
): Result<number, string> {
  const value = evaluateExpression(index, scope, expression, depth + 1);
  if (!value.ok) return value;
  return typeof value.value === "number" ? ok(value.value) : err("expected an integer");
}

function readField(
  index: PackIndex,
  scope: EvaluationScope,
  name: string,
  depth: number,
): Result<Value, string> {
  if (scope.element !== null) return readElementField(index, scope, name, depth);
  const stored = scope.values[name];
  if (stored !== undefined) return ok(stored);
  const derived = scope.aggregate.derived.find((candidate) => candidate.codeName === name);
  if (derived !== undefined) return evaluateExpression(index, scope, derived.expression, depth + 1);
  return err(`unknown field ${name} on ${scope.aggregate.codeName}`);
}

function readElementField(
  index: PackIndex,
  scope: EvaluationScope,
  name: string,
  depth: number,
): Result<Value, string> {
  const element = scope.element;
  if (element === null) return err("no collection element in scope");
  const stored = element.object[name];
  if (stored !== undefined) return ok(stored);
  const entity =
    element.entityName === null ? undefined : index.entities.get(element.entityName)?.entity;
  const derived = entity?.derived.find((candidate) => candidate.codeName === name);
  if (derived !== undefined) return evaluateExpression(index, scope, derived.expression, depth + 1);
  return err(`unknown field ${name} on collection element`);
}

function sumOf(
  index: PackIndex,
  scope: EvaluationScope,
  expression: Extract<Expression, { op: "sumOf" }>,
  depth: number,
): Result<Value, string> {
  const collection = evaluateExpression(index, scope, expression.collection, depth + 1);
  if (!collection.ok) return collection;
  if (!Array.isArray(collection.value)) return err("sumOf needs a list");
  const entityName = elementEntityName(index, scope, expression.collection);
  let total = 0;
  for (const element of collection.value) {
    if (!isValueRecord(element)) return err("sumOf needs a list of records");
    const elementScope: EvaluationScope = {
      ...scope,
      element: { entityName, object: element satisfies ValueRecord },
    };
    const term = evaluateInteger(index, elementScope, expression.term, depth);
    if (!term.ok) return term;
    total += term.value;
  }
  return ok(total);
}

function elementEntityName(
  index: PackIndex,
  scope: EvaluationScope,
  collection: Expression,
): TypeName | null {
  const type = staticTypeOf(scope, collection);
  if (type?.kind !== "list" || type.of.kind !== "entity") return null;
  return index.entities.has(type.of.ref) ? type.of.ref : null;
}

function staticTypeOf(scope: EvaluationScope, expression: Expression): FieldType | undefined {
  if (expression.op === "arg") return scope.argumentTypes[expression.name];
  if (expression.op !== "field") return undefined;
  const declared =
    scope.aggregate.fields.find((field) => field.codeName === expression.name) ??
    scope.aggregate.states
      .flatMap((state) => state.data)
      .find((field) => field.codeName === expression.name) ??
    scope.aggregate.derived.find((field) => field.codeName === expression.name);
  return declared?.type;
}

function arithmetic(
  index: PackIndex,
  scope: EvaluationScope,
  expression: Extract<Expression, { op: "arithmetic" }>,
  depth: number,
): Result<Value, string> {
  const left = evaluateInteger(index, scope, expression.left, depth);
  if (!left.ok) return left;
  const right = evaluateInteger(index, scope, expression.right, depth);
  if (!right.ok) return right;
  switch (expression.operator) {
    case "add":
      return ok(left.value + right.value);
    case "subtract":
      return ok(left.value - right.value);
    case "multiply":
      return ok(left.value * right.value);
  }
}
