import { z } from "zod";
import { localizedTextSchema } from "../../locale/LocalizedText";
import { typeNameSchema } from "../naming/CodeName";
import { fieldSchema } from "./Field";
import { literalSchema } from "./Literal";
import { presentableShape } from "./Presentable";

const constraintCommonShape = {
  errorCode: typeNameSchema,
  message: localizedTextSchema,
  /** Values this specific constraint must reject (and nothing else may reject them first). */
  invalidExamples: z.array(literalSchema).min(1),
};

export const constraintSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("minLength"),
    value: z.number().int().min(0),
    ...constraintCommonShape,
  }),
  z.strictObject({
    kind: z.literal("maxLength"),
    value: z.number().int().min(1),
    ...constraintCommonShape,
  }),
  z.strictObject({ kind: z.literal("min"), value: z.number().int(), ...constraintCommonShape }),
  z.strictObject({ kind: z.literal("max"), value: z.number().int(), ...constraintCommonShape }),
  /** The whole value must match. Only the portable regular-expression subset is allowed (rule S19). */
  z.strictObject({
    kind: z.literal("pattern"),
    value: z.string().min(1),
    ...constraintCommonShape,
  }),
]);
export type Constraint = z.infer<typeof constraintSchema>;

const valueObjectIdentityShape = { codeName: typeNameSchema, ...presentableShape };

export const valueObjectSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("scalar"),
    ...valueObjectIdentityShape,
    base: z.enum(["string", "integer"]),
    constraints: z.array(constraintSchema),
    examples: z.strictObject({ valid: z.array(literalSchema).min(1) }),
  }),
  z.strictObject({
    kind: z.literal("record"),
    ...valueObjectIdentityShape,
    fields: z.array(fieldSchema).min(1),
    examples: z.strictObject({ valid: z.array(literalSchema).min(1) }),
  }),
  z.strictObject({
    kind: z.literal("enum"),
    ...valueObjectIdentityShape,
    members: z
      .array(z.strictObject({ codeName: typeNameSchema, label: localizedTextSchema }))
      .min(2),
  }),
]);
export type ValueObject = z.infer<typeof valueObjectSchema>;
export type ScalarValueObject = Extract<ValueObject, { kind: "scalar" }>;
export type RecordValueObject = Extract<ValueObject, { kind: "record" }>;
export type EnumValueObject = Extract<ValueObject, { kind: "enum" }>;
