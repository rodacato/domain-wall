import type { PackIndex } from "../../domain/pack/PackIndex";
import type { Aggregate, Entity } from "../../domain/pack/schema/Aggregate";
import type { Command } from "../../domain/pack/schema/EventStorming";
import type { Expression } from "../../domain/pack/schema/Expression";
import type { FieldType } from "../../domain/pack/schema/FieldType";
import type { LanguageSyntax } from "../languages/LanguageDescriptor";
import { fill } from "./fill";
import type { LanguageNaming } from "./LanguageNaming";
import { renderLiteral } from "./renderLiteral";

export interface ExpressionContext {
  readonly index: PackIndex;
  readonly aggregate: Aggregate;
  readonly syntax: LanguageSyntax;
  readonly naming: LanguageNaming;
  /** Whether `field` reads the aggregate or the entity whose derived value is being computed. */
  readonly scope:
    { readonly kind: "aggregate" } | { readonly kind: "entity"; readonly entity: Entity };
  /** The instance fields are read from: the one running the command, or the one it produced. */
  readonly self: "current" | "next";
  /** The command being run, which gives the types of its arguments; null outside commands. */
  readonly command: Command | null;
}

function elementVariable(depth: number): string {
  return depth === 0 ? "item" : `item${depth + 1}`;
}

interface DeclaredField {
  readonly type: FieldType;
  /** Stored as possibly absent: optional fields and the data of a state. */
  readonly mayBeAbsent: boolean;
}

function declaredField(context: ExpressionContext, name: string): DeclaredField | undefined {
  const { aggregate, scope } = context;
  if (scope.kind === "entity") {
    const field = [...scope.entity.fields, ...scope.entity.derived].find(
      (candidate) => candidate.codeName === name,
    );
    return field === undefined
      ? undefined
      : { type: field.type, mayBeAbsent: field.type.kind === "optional" };
  }
  const stored = aggregate.fields.find((candidate) => candidate.codeName === name);
  if (stored !== undefined)
    return { type: stored.type, mayBeAbsent: stored.type.kind === "optional" };
  const derived = aggregate.derived.find((candidate) => candidate.codeName === name);
  if (derived !== undefined) return { type: derived.type, mayBeAbsent: false };
  const stateData = aggregate.states
    .flatMap((state) => state.data)
    .find((candidate) => candidate.codeName === name);
  return stateData === undefined ? undefined : { type: stateData.type, mayBeAbsent: true };
}

function unwrapOptional(type: FieldType): FieldType {
  return type.kind === "optional" ? unwrapOptional(type.of) : type;
}

/** The static type of an expression when it can be known; undefined for literals and element fields. */
export function staticTypeOf(
  context: ExpressionContext,
  expression: Expression,
): FieldType | undefined {
  switch (expression.op) {
    case "arg":
      return context.command?.params.find((param) => param.codeName === expression.name)?.type;
    case "field": {
      const declared = declaredField(context, expression.name);
      return declared === undefined ? undefined : unwrapOptional(declared.type);
    }
    case "count":
    case "sumOf":
    case "arithmetic":
      return { kind: "primitive", name: "integer" };
    case "literal":
    case "construct":
      return undefined;
  }
}

function scalarValueObjectOf(
  context: ExpressionContext,
  type: FieldType | undefined,
): { readonly name: string; readonly base: "string" | "integer" } | undefined {
  if (type?.kind !== "valueObject") return undefined;
  const valueObject = context.index.valueObjects.get(type.ref);
  return valueObject?.kind === "scalar" ? { name: type.ref, base: valueObject.base } : undefined;
}

/** How deeply sumOf calls nest, to name each collection element differently. */
export function renderExpression(
  context: ExpressionContext,
  expression: Expression,
  elementDepth = 0,
): string {
  const { syntax, naming } = context;
  switch (expression.op) {
    case "literal":
      return renderLiteral(syntax, expression.value);
    case "arg":
      return fill(syntax.expressions.argument, { name: naming.member(expression.name) });
    case "field":
      return renderField(context, expression.name, elementDepth);
    case "count":
      return fill(syntax.expressions.count, {
        collection: renderExpression(context, expression.collection, elementDepth),
      });
    case "sumOf":
      return fill(syntax.expressions.sumOf, {
        collection: renderExpression(context, expression.collection, elementDepth),
        element: elementVariable(elementDepth),
        term: renderOperand(context, expression.term, elementDepth + 1),
      });
    case "arithmetic": {
      const operand = (child: Expression): string => {
        const rendered = renderOperand(context, child, elementDepth);
        return child.op === "arithmetic"
          ? fill(syntax.predicates.group, { inner: rendered })
          : rendered;
      };
      return fill(syntax.expressions.arithmetic, {
        left: operand(expression.left),
        operator: syntax.operators.arithmetic[expression.operator],
        right: operand(expression.right),
      });
    }
    case "construct":
      return renderConstruct(context, expression, elementDepth);
  }
}

/** Renders an expression whose value is used (compared, summed, assigned), so an absent-capable field is asserted present. */
export function renderOperand(
  context: ExpressionContext,
  expression: Expression,
  elementDepth = 0,
): string {
  const rendered = renderExpression(context, expression, elementDepth);
  if (expression.op !== "field" || elementDepth > 0) return rendered;
  return declaredField(context, expression.name)?.mayBeAbsent === true
    ? fill(context.syntax.expressions.assertPresent, { value: rendered })
    : rendered;
}

/** Renders a value that will be stored in a slot of the given type, wrapping computed numbers as value objects. */
export function renderTypedValue(
  context: ExpressionContext,
  expression: Expression,
  target: FieldType,
  elementDepth = 0,
): string {
  const targetScalar = scalarValueObjectOf(context, unwrapOptional(target));
  const computed =
    expression.op === "literal" ||
    expression.op === "arithmetic" ||
    expression.op === "count" ||
    expression.op === "sumOf";
  if (computed && targetScalar !== undefined) {
    return fill(context.syntax.expressions.trusted, {
      type: context.naming.type(targetScalar.name),
      value: renderExpression(context, expression, elementDepth),
    });
  }
  return target.kind === "optional"
    ? renderExpression(context, expression, elementDepth)
    : renderOperand(context, expression, elementDepth);
}

/** Comparison operands, widened to their base type when they are different value objects. */
export function renderComparable(
  context: ExpressionContext,
  left: Expression,
  right: Expression,
): readonly [string, string] {
  const leftScalar = scalarValueObjectOf(context, staticTypeOf(context, left));
  const rightScalar = scalarValueObjectOf(context, staticTypeOf(context, right));
  const renderedLeft = renderOperand(context, left);
  const renderedRight = renderOperand(context, right);
  if (leftScalar === undefined || rightScalar === undefined || leftScalar.name === rightScalar.name)
    return [renderedLeft, renderedRight];
  const base =
    leftScalar.base === "string" ? context.syntax.types.string : context.syntax.types.integer;
  return [
    fill(context.syntax.expressions.widen, { value: renderedLeft, base }),
    fill(context.syntax.expressions.widen, { value: renderedRight, base }),
  ];
}

function renderField(context: ExpressionContext, name: string, elementDepth: number): string {
  const { syntax, naming, aggregate, scope } = context;
  const memberName = naming.member(name);
  if (elementDepth > 0) {
    return fill(syntax.expressions.elementField, {
      element: elementVariable(elementDepth - 1),
      name: memberName,
    });
  }
  if (scope.kind === "entity") return fill(syntax.expressions.entityField, { name: memberName });
  const self = syntax.selfNames[context.self];
  const isDerived = aggregate.derived.some((derived) => derived.codeName === name);
  return fill(isDerived ? syntax.expressions.derived : syntax.expressions.field, {
    self,
    name: memberName,
  });
}

function renderConstruct(
  context: ExpressionContext,
  expression: Extract<Expression, { op: "construct" }>,
  elementDepth: number,
): string {
  const { syntax, naming, index } = context;
  const entity = index.entities.get(expression.type)?.entity;
  const record = index.valueObjects.get(expression.type);
  const declared = entity?.fields ?? (record?.kind === "record" ? record.fields : []);
  const argumentTemplate =
    entity !== undefined
      ? syntax.expressions.constructEntityArgument
      : syntax.expressions.constructRecordArgument;

  const rendered = declared.flatMap((field) => {
    const given = expression.fields.find((candidate) => candidate.name === field.codeName);
    if (given === undefined) return [];
    return [
      fill(argumentTemplate, {
        name: naming.member(field.codeName),
        value: renderTypedValue(context, given.value, field.type, elementDepth),
      }),
    ];
  });
  return fill(
    entity !== undefined ? syntax.expressions.constructEntity : syntax.expressions.constructRecord,
    {
      type: naming.type(expression.type),
      arguments: rendered.join(", "),
    },
  );
}
