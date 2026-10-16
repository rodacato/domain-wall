import type {
  ComparisonOperator,
  Expression,
  Predicate,
} from "../../domain/pack/schema/Expression";
import { fill } from "./fill";
import { renderComparable, renderExpression, type ExpressionContext } from "./renderExpression";

/** A predicate extended with the negations (absent, empty) that guards need as conditions of their own. */
type Condition =
  | {
      readonly kind: "compare";
      readonly left: Expression;
      readonly operator: ComparisonOperator;
      readonly right: Expression;
    }
  | { readonly kind: "present" | "absent" | "notEmpty" | "empty"; readonly value: Expression }
  | { readonly kind: "all" | "any"; readonly of: readonly Condition[] }
  | { readonly kind: "not"; readonly of: Condition };

const OPPOSITE: Readonly<Record<ComparisonOperator, ComparisonOperator>> = {
  "==": "!=",
  "!=": "==",
  "<": ">=",
  "<=": ">",
  ">": "<=",
  ">=": "<",
};

function toCondition(predicate: Predicate): Condition {
  switch (predicate.kind) {
    case "all":
    case "any":
      return { kind: predicate.kind, of: predicate.of.map(toCondition) };
    case "not":
      return { kind: "not", of: toCondition(predicate.of) };
    case "compare":
    case "present":
    case "notEmpty":
      return predicate;
  }
}

/** The condition under which the predicate fails, so guards read as `if (<failure>) return error`. */
function invert(condition: Condition): Condition {
  switch (condition.kind) {
    case "compare":
      return { ...condition, operator: OPPOSITE[condition.operator] };
    case "present":
      return { kind: "absent", value: condition.value };
    case "absent":
      return { kind: "present", value: condition.value };
    case "notEmpty":
      return { kind: "empty", value: condition.value };
    case "empty":
      return { kind: "notEmpty", value: condition.value };
    case "all":
      return { kind: "any", of: condition.of.map(invert) };
    case "any":
      return { kind: "all", of: condition.of.map(invert) };
    case "not":
      return condition.of;
  }
}

interface Rendered {
  readonly text: string;
  /** True when the text joins several conditions, so a parent must parenthesise it. */
  readonly compound: boolean;
}

function render(context: ExpressionContext, condition: Condition): Rendered {
  const { syntax } = context;
  const expression = (value: Expression): string => renderExpression(context, value);
  switch (condition.kind) {
    case "compare": {
      const [left, right] = renderComparable(context, condition.left, condition.right);
      return {
        compound: false,
        text: `${left} ${syntax.operators.comparison[condition.operator]} ${right}`,
      };
    }
    case "present":
    case "absent":
    case "notEmpty":
    case "empty":
      return {
        compound: false,
        text: fill(syntax.predicates[condition.kind], { value: expression(condition.value) }),
      };
    case "all":
    case "any": {
      const parts = condition.of.map((child) => {
        const rendered = render(context, child);
        return rendered.compound
          ? fill(syntax.predicates.group, { inner: rendered.text })
          : rendered.text;
      });
      const joiner =
        condition.kind === "all" ? syntax.predicates.allJoiner : syntax.predicates.anyJoiner;
      return { compound: parts.length > 1, text: parts.join(joiner) };
    }
    case "not":
      return {
        compound: false,
        text: fill(syntax.predicates.not, { inner: render(context, condition.of).text }),
      };
  }
}

/** The condition that holds when the rule is satisfied. */
export function renderHolds(context: ExpressionContext, predicate: Predicate): string {
  return render(context, toCondition(predicate)).text;
}

/** The condition that holds when the rule is violated. */
export function renderFailure(context: ExpressionContext, predicate: Predicate): string {
  return render(context, invert(toCondition(predicate))).text;
}
