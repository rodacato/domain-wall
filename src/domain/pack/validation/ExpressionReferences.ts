import type { Expression, Predicate } from "../schema/Expression";

/** Names an expression reads, split by the scope they are read from. */
export interface ExpressionReferences {
  /** `field` reads that resolve against the aggregate. */
  readonly aggregateFields: ReadonlySet<string>;
  /** `field` reads inside a `sumOf` term; they resolve against the collection element. */
  readonly elementFields: ReadonlySet<string>;
  readonly arguments: ReadonlySet<string>;
}

export function referencesOfExpression(expression: Expression): ExpressionReferences {
  const aggregateFields = new Set<string>();
  const elementFields = new Set<string>();
  const args = new Set<string>();

  const visit = (node: Expression, insideElementScope: boolean): void => {
    switch (node.op) {
      case "literal":
        return;
      case "field":
        (insideElementScope ? elementFields : aggregateFields).add(node.name);
        return;
      case "arg":
        args.add(node.name);
        return;
      case "count": {
        visit(node.collection, insideElementScope);
        return;
      }
      case "sumOf":
        visit(node.collection, insideElementScope);
        {
          visit(node.term, true);
          return;
        }
      case "arithmetic":
        visit(node.left, insideElementScope);
        {
          visit(node.right, insideElementScope);
          return;
        }
      case "construct":
        for (const field of node.fields) visit(field.value, insideElementScope);
    }
  };
  visit(expression, false);
  return { aggregateFields, elementFields, arguments: args };
}

export function referencesOfPredicate(predicate: Predicate): ExpressionReferences {
  const parts: ExpressionReferences[] = [];
  const visit = (node: Predicate): void => {
    switch (node.kind) {
      case "compare":
        parts.push(referencesOfExpression(node.left), referencesOfExpression(node.right));
        return;
      case "present":
      case "notEmpty":
        parts.push(referencesOfExpression(node.value));
        return;
      case "all":
      case "any":
        node.of.forEach(visit);
        return;
      case "not":
        visit(node.of);
    }
  };
  visit(predicate);
  return mergeReferences(parts);
}

export function mergeReferences(parts: readonly ExpressionReferences[]): ExpressionReferences {
  return {
    aggregateFields: new Set(parts.flatMap((part) => [...part.aggregateFields])),
    elementFields: new Set(parts.flatMap((part) => [...part.elementFields])),
    arguments: new Set(parts.flatMap((part) => [...part.arguments])),
  };
}
