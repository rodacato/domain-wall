import { z } from "zod";
import { localizedTextSchema } from "../../locale/LocalizedText";
import { memberNameSchema, typeNameSchema } from "../naming/CodeName";
import { expressionSchema, predicateSchema } from "./Expression";
import { fieldSchema } from "./Field";
import { fieldTypeSchema } from "./FieldType";
import { literalSchema } from "./Literal";
import { presentableShape } from "./Presentable";

/** A command invocation inside a scenario. Omitted arguments are filled from value-object examples. */
export const commandCallSchema = z.strictObject({
  command: typeNameSchema,
  args: z.record(z.string(), literalSchema),
});
export type CommandCall = z.infer<typeof commandCallSchema>;

export const scenarioSchema = z.strictObject({
  /** Commands that take the aggregate to the state in which `when` must be rejected. */
  given: z.array(commandCallSchema),
  when: commandCallSchema,
});
export type Scenario = z.infer<typeof scenarioSchema>;

/**
 * A rule is a condition that must hold. Its code name doubles as the error code. The same shape
 * serves as a transition guard (checked against current state and arguments, before the
 * transition) and as an aggregate invariant (checked against the resulting state, always).
 */
export const ruleSchema = z.strictObject({
  codeName: typeNameSchema,
  ...presentableShape,
  predicate: predicateSchema,
  /** What the user sees in the UI when the rule rejects a command. */
  message: localizedTextSchema,
  violation: scenarioSchema,
});
export type Rule = z.infer<typeof ruleSchema>;

export const derivedFieldSchema = z.strictObject({
  codeName: memberNameSchema,
  label: localizedTextSchema,
  type: fieldTypeSchema,
  expression: expressionSchema,
});
export type DerivedField = z.infer<typeof derivedFieldSchema>;

export const entitySchema = z.strictObject({
  codeName: typeNameSchema,
  ...presentableShape,
  /** Name of the field (declared in `fields`) that identifies the entity inside its aggregate. */
  identity: memberNameSchema,
  fields: z.array(fieldSchema).min(1),
  derived: z.array(derivedFieldSchema),
});
export type Entity = z.infer<typeof entitySchema>;

export const stateSchema = z.strictObject({
  codeName: typeNameSchema,
  ...presentableShape,
  terminal: z.boolean(),
  /** Data that only exists while the aggregate is in this state, for example a tracking number. */
  data: z.array(fieldSchema),
});
export type State = z.infer<typeof stateSchema>;

export const effectSchema = z.discriminatedUnion("op", [
  z.strictObject({ op: z.literal("set"), field: memberNameSchema, value: expressionSchema }),
  z.strictObject({ op: z.literal("append"), field: memberNameSchema, value: expressionSchema }),
]);
export type Effect = z.infer<typeof effectSchema>;

export const transitionSchema = z.strictObject({
  command: typeNameSchema,
  from: z.array(typeNameSchema).min(1),
  to: typeNameSchema,
  /** Rules checked in order before the transition. */
  guards: z.array(typeNameSchema),
  effects: z.array(effectSchema),
  emits: z.array(typeNameSchema).min(1),
});
export type Transition = z.infer<typeof transitionSchema>;

export const aggregateSchema = z.strictObject({
  codeName: typeNameSchema,
  ...presentableShape,
  context: typeNameSchema,
  /** Name of the field (declared in `fields`) that identifies the aggregate root. */
  identity: memberNameSchema,
  fields: z.array(fieldSchema).min(1),
  derived: z.array(derivedFieldSchema),
  entities: z.array(entitySchema),
  states: z.array(stateSchema).min(2),
  initialState: typeNameSchema,
  rules: z.array(ruleSchema).min(1),
  /** Rules that must hold after every transition. */
  invariants: z.array(typeNameSchema),
  /** A (command, state) pair without a transition is rejected as invalid for the current state. */
  transitions: z.array(transitionSchema).min(1),
  /** A complete happy path from the initial state to a terminal state; it must be accepted. */
  walkthrough: z.array(commandCallSchema).min(1),
});
export type Aggregate = z.infer<typeof aggregateSchema>;
