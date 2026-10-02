import type { PackIndex } from "../PackIndex";
import { err, ok, type Result } from "../../shared/Result";
import type { ComparisonOperator, Predicate } from "../schema/Expression";
import type { EvaluationScope } from "./EvaluationScope";
import { evaluateExpression } from "./evaluateExpression";
import { valuesAreEqual, type Value } from "./Value";

/** Whether the predicate holds. A rule rejects a command when its predicate does NOT hold. */
export function evaluatePredicate(
  index: PackIndex,
  scope: EvaluationScope,
  predicate: Predicate,
): Result<boolean, string> {
  switch (predicate.kind) {
    case "compare": {
      const left = evaluateExpression(index, scope, predicate.left);
      if (!left.ok) return left;
      const right = evaluateExpression(index, scope, predicate.right);
      if (!right.ok) return right;
      return compare(left.value, predicate.operator, right.value);
    }
    case "present": {
      const value = evaluateExpression(index, scope, predicate.value);
      return value.ok ? ok(value.value !== null) : value;
    }
    case "notEmpty": {
      const value = evaluateExpression(index, scope, predicate.value);
      if (!value.ok) return value;
      return Array.isArray(value.value) ? ok(value.value.length > 0) : err("notEmpty needs a list");
    }
    case "all":
      return combine(index, scope, predicate.of, (results) => results.every(Boolean));
    case "any":
      return combine(index, scope, predicate.of, (results) => results.some(Boolean));
    case "not": {
      const inner = evaluatePredicate(index, scope, predicate.of);
      return inner.ok ? ok(!inner.value) : inner;
    }
  }
}

function combine(
  index: PackIndex,
  scope: EvaluationScope,
  predicates: readonly Predicate[],
  reduce: (results: readonly boolean[]) => boolean,
): Result<boolean, string> {
  const results: boolean[] = [];
  for (const predicate of predicates) {
    const result = evaluatePredicate(index, scope, predicate);
    if (!result.ok) return result;
    results.push(result.value);
  }
  return ok(reduce(results));
}

function compare(left: Value, operator: ComparisonOperator, right: Value): Result<boolean, string> {
  if (operator === "==") return ok(valuesAreEqual(left, right));
  if (operator === "!=") return ok(!valuesAreEqual(left, right));
  const comparable =
    (typeof left === "number" && typeof right === "number") ||
    (typeof left === "string" && typeof right === "string");
  if (!comparable) return err(`cannot order ${typeof left} against ${typeof right}`);
  switch (operator) {
    case "<":
      return ok(left < right);
    case "<=":
      return ok(left <= right);
    case ">":
      return ok(left > right);
    case ">=":
      return ok(left >= right);
  }
}
