import { z } from "zod";
import { localizedTextSchema } from "../../locale/LocalizedText";
import { typeNameSchema } from "../naming/CodeName";
import { commandCallSchema, ruleSchema, stateSchema, transitionSchema } from "./Aggregate";
import { commandSchema, domainEventSchema } from "./EventStorming";
import { valueObjectSchema } from "./ValueObject";

/**
 * Edits that a business change applies to a pack. A closed set, so the course can animate and
 * regenerate code for a change it has never seen.
 */
export const patchOperationSchema = z.discriminatedUnion("op", [
  z.strictObject({ op: z.literal("addValueObject"), valueObject: valueObjectSchema }),
  z.strictObject({ op: z.literal("addEvent"), event: domainEventSchema }),
  z.strictObject({ op: z.literal("addCommand"), command: commandSchema }),
  z.strictObject({ op: z.literal("addState"), aggregate: typeNameSchema, state: stateSchema }),
  z.strictObject({ op: z.literal("addRule"), aggregate: typeNameSchema, rule: ruleSchema }),
  z.strictObject({
    op: z.literal("addTransition"),
    aggregate: typeNameSchema,
    transition: transitionSchema,
  }),
  z.strictObject({
    op: z.literal("replaceWalkthrough"),
    aggregate: typeNameSchema,
    walkthrough: z.array(commandCallSchema).min(1),
  }),
  z.strictObject({
    op: z.literal("restrictTransition"),
    aggregate: typeNameSchema,
    command: typeNameSchema,
    removeFrom: z.array(typeNameSchema).min(1),
  }),
]);
export type PatchOperation = z.infer<typeof patchOperationSchema>;

export const changeScenarioSchema = z.strictObject({
  /** The requirement, told by an expert. */
  story: localizedTextSchema,
  patch: z.array(patchOperationSchema).min(1),
});
export type ChangeScenario = z.infer<typeof changeScenarioSchema>;
