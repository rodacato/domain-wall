import { z } from "zod";
import { localizedTextSchema } from "../../locale/LocalizedText";
import { memberNameSchema, typeNameSchema } from "../naming/CodeName";
import { expressionSchema } from "./Expression";
import { fieldSchema } from "./Field";
import { presentableShape } from "./Presentable";

/** The type a stage outputs: its own fields plus everything inherited from `extends`. */
export const intermediateTypeSchema = z.strictObject({
  codeName: typeNameSchema,
  extends: typeNameSchema.nullable(),
  fields: z.array(fieldSchema),
});
export type IntermediateType = z.infer<typeof intermediateTypeSchema>;

/** Closed catalog of stage kinds; each has its own template (ADR 2). */
export const stageKindSchema = z.discriminatedUnion("type", [
  /** Builds value objects from raw input through their smart constructors. */
  z.strictObject({ type: z.literal("validate") }),
  z.strictObject({
    type: z.literal("compute"),
    assigns: z
      .array(z.strictObject({ field: memberNameSchema, expression: expressionSchema }))
      .min(1),
  }),
  /** Calls something outside the domain through an injected function (a port). */
  z.strictObject({
    type: z.literal("callPort"),
    port: z.strictObject({
      codeName: typeNameSchema,
      operation: memberNameSchema,
      description: localizedTextSchema,
    }),
  }),
  /** Persists the result and publishes the workflow's events. */
  z.strictObject({ type: z.literal("commit") }),
]);
export type StageKind = z.infer<typeof stageKindSchema>;

export const stageSchema = z.strictObject({
  codeName: typeNameSchema,
  ...presentableShape,
  input: typeNameSchema,
  output: typeNameSchema,
  kind: stageKindSchema,
  errors: z.array(z.strictObject({ codeName: typeNameSchema, message: localizedTextSchema })),
});
export type Stage = z.infer<typeof stageSchema>;

export const workflowSchema = z.strictObject({
  codeName: typeNameSchema,
  ...presentableShape,
  trigger: typeNameSchema,
  intermediateTypes: z.array(intermediateTypeSchema).min(2),
  stages: z.array(stageSchema).min(2),
  produces: z.array(typeNameSchema).min(1),
});
export type Workflow = z.infer<typeof workflowSchema>;
