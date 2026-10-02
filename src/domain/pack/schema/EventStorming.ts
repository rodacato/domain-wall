import { z } from "zod";
import { localizedTextSchema } from "../../locale/LocalizedText";
import { typeNameSchema } from "../naming/CodeName";
import { fieldSchema } from "./Field";
import { presentableShape } from "./Presentable";

/** A domain expert character who speaks in the course dialogues. The name is a proper noun, not translated. */
export const expertSchema = z.strictObject({
  codeName: typeNameSchema,
  name: z.string().min(1),
  role: localizedTextSchema,
  avatarSeed: z.string().min(1),
});
export type Expert = z.infer<typeof expertSchema>;

export const actorSchema = z.strictObject({ codeName: typeNameSchema, ...presentableShape });
export type Actor = z.infer<typeof actorSchema>;

export const externalSystemSchema = z.strictObject({
  codeName: typeNameSchema,
  ...presentableShape,
});
export type ExternalSystem = z.infer<typeof externalSystemSchema>;

export const domainEventSchema = z.strictObject({
  codeName: typeNameSchema,
  ...presentableShape,
  context: typeNameSchema,
  /** Position on the wall's timeline; events are ordered by this number. Fractions let a change insert events in between. */
  sequence: z.number().positive(),
  payload: z.array(fieldSchema),
});
export type DomainEvent = z.infer<typeof domainEventSchema>;

/** Who or what issues a command: an actor, a policy reacting to an event, or an external system. */
export const commandIssuerSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("actor"), ref: typeNameSchema }),
  z.strictObject({ kind: z.literal("policy"), ref: typeNameSchema }),
  z.strictObject({ kind: z.literal("externalSystem"), ref: typeNameSchema }),
]);
export type CommandIssuer = z.infer<typeof commandIssuerSchema>;

export const commandSchema = z.strictObject({
  codeName: typeNameSchema,
  ...presentableShape,
  context: typeNameSchema,
  issuedBy: commandIssuerSchema,
  handledBy: typeNameSchema,
  params: z.array(fieldSchema),
});
export type Command = z.infer<typeof commandSchema>;

/** "Whenever {when} happens, then {then}": lilac note. */
export const policySchema = z.strictObject({
  codeName: typeNameSchema,
  ...presentableShape,
  context: typeNameSchema,
  when: typeNameSchema,
  then: typeNameSchema,
});
export type Policy = z.infer<typeof policySchema>;

export const readModelSchema = z.strictObject({
  codeName: typeNameSchema,
  ...presentableShape,
  context: typeNameSchema,
  fields: z.array(fieldSchema).min(1),
  fedBy: z.array(typeNameSchema).min(1),
  usedBy: z.array(typeNameSchema).min(1),
});
export type ReadModel = z.infer<typeof readModelSchema>;
