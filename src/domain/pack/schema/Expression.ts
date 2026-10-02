import { z } from "zod";
import {
  memberNameSchema,
  typeNameSchema,
  type MemberName,
  type TypeName,
} from "../naming/CodeName";
import { literalSchema, type Literal } from "./Literal";

/**
 * Closed expression vocabulary. A pack can compute values but can never run arbitrary logic
 * (see ADR 2). Scopes:
 * - `field` reads the aggregate (fields, derived values, state data) or, inside `sumOf.term`,
 *   the collection element being summed;
 * - `arg` reads a command argument (only legal in guards and effects).
 */
export type Expression =
  | { readonly op: "literal"; readonly value: Literal }
  | { readonly op: "field"; readonly name: MemberName }
  | { readonly op: "arg"; readonly name: MemberName }
  | { readonly op: "sumOf"; readonly collection: Expression; readonly term: Expression }
  | { readonly op: "count"; readonly collection: Expression }
  | {
      readonly op: "arithmetic";
      readonly operator: ArithmeticOperator;
      readonly left: Expression;
      readonly right: Expression;
    }
  | {
      readonly op: "construct";
      readonly type: TypeName;
      readonly fields: readonly { readonly name: MemberName; readonly value: Expression }[];
    };

export const ARITHMETIC_OPERATORS = ["add", "subtract", "multiply"] as const;
export type ArithmeticOperator = (typeof ARITHMETIC_OPERATORS)[number];

export const expressionSchema: z.ZodType<Expression> = z.lazy(() =>
  z.discriminatedUnion("op", [
    z.strictObject({ op: z.literal("literal"), value: literalSchema }),
    z.strictObject({ op: z.literal("field"), name: memberNameSchema }),
    z.strictObject({ op: z.literal("arg"), name: memberNameSchema }),
    z.strictObject({
      op: z.literal("sumOf"),
      collection: expressionSchema,
      term: expressionSchema,
    }),
    z.strictObject({ op: z.literal("count"), collection: expressionSchema }),
    z.strictObject({
      op: z.literal("arithmetic"),
      operator: z.enum(ARITHMETIC_OPERATORS),
      left: expressionSchema,
      right: expressionSchema,
    }),
    z.strictObject({
      op: z.literal("construct"),
      type: typeNameSchema,
      fields: z.array(z.strictObject({ name: memberNameSchema, value: expressionSchema })),
    }),
  ]),
);

export const COMPARISON_OPERATORS = ["==", "!=", "<", "<=", ">", ">="] as const;
export type ComparisonOperator = (typeof COMPARISON_OPERATORS)[number];

/** A condition that must HOLD for a command (guard) or an aggregate state (invariant) to be valid. */
export type Predicate =
  | {
      readonly kind: "compare";
      readonly left: Expression;
      readonly operator: ComparisonOperator;
      readonly right: Expression;
    }
  | { readonly kind: "present"; readonly value: Expression }
  | { readonly kind: "notEmpty"; readonly value: Expression }
  | { readonly kind: "all"; readonly of: readonly Predicate[] }
  | { readonly kind: "any"; readonly of: readonly Predicate[] }
  | { readonly kind: "not"; readonly of: Predicate };

export const predicateSchema: z.ZodType<Predicate> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.strictObject({
      kind: z.literal("compare"),
      left: expressionSchema,
      operator: z.enum(COMPARISON_OPERATORS),
      right: expressionSchema,
    }),
    z.strictObject({ kind: z.literal("present"), value: expressionSchema }),
    z.strictObject({ kind: z.literal("notEmpty"), value: expressionSchema }),
    z.strictObject({ kind: z.literal("all"), of: z.array(predicateSchema).min(1) }),
    z.strictObject({ kind: z.literal("any"), of: z.array(predicateSchema).min(1) }),
    z.strictObject({ kind: z.literal("not"), of: predicateSchema }),
  ]),
);
