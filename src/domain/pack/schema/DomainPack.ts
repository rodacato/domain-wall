import { z } from "zod";
import { SUPPORTED_LOCALES } from "../../locale/LocaleRegistry";
import { localizedTextSchema } from "../../locale/LocalizedText";
import { typeNameSchema } from "../naming/CodeName";
import { aggregateSchema } from "./Aggregate";
import { changeScenarioSchema } from "./ChangeScenario";
import { dialoguesSchema } from "./Dialogue";
import {
  actorSchema,
  commandSchema,
  domainEventSchema,
  expertSchema,
  externalSystemSchema,
  policySchema,
  readModelSchema,
} from "./EventStorming";
import {
  ambiguousTermSchema,
  antiCorruptionLayerSchema,
  boundedContextSchema,
  contextRelationSchema,
} from "./Strategy";
import { valueObjectSchema } from "./ValueObject";
import { workflowSchema } from "./Workflow";

export const CURRENT_SCHEMA_VERSION = 1;

export const PACK_ORIGINS = ["handcrafted", "preset", "generated"] as const;

/**
 * Everything specific to an industry. The course syllabus, concept explanations, animations and
 * code templates never change per industry; they render over this document (ADR 2).
 *
 * Value objects are shared by every context (a deliberate v1 simplification; the generated code
 * places them in a shared module).
 */
export const domainPackSchema = z.strictObject({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  meta: z.strictObject({
    packId: z.string().regex(/^[a-z][a-z0-9-]*$/, "packId must be a lowercase slug"),
    origin: z.enum(PACK_ORIGINS),
    locales: z.array(z.enum(SUPPORTED_LOCALES)).min(1),
    generation: z
      .strictObject({ model: z.string().min(1), attempts: z.number().int().min(1) })
      .nullable(),
  }),
  business: z.strictObject({
    codeName: typeNameSchema,
    name: localizedTextSchema,
    description: localizedTextSchema,
  }),

  experts: z.array(expertSchema).min(1),
  actors: z.array(actorSchema).min(1),
  events: z.array(domainEventSchema).min(1),
  commands: z.array(commandSchema).min(1),
  policies: z.array(policySchema),
  externalSystems: z.array(externalSystemSchema),
  readModels: z.array(readModelSchema),

  contexts: z.array(boundedContextSchema).min(2),
  contextRelations: z.array(contextRelationSchema).min(1),
  ambiguousTerm: ambiguousTermSchema,
  antiCorruptionLayer: antiCorruptionLayerSchema,

  valueObjects: z.array(valueObjectSchema).min(1),
  aggregates: z.array(aggregateSchema).min(1),
  workflow: workflowSchema,

  dialogues: dialoguesSchema,
  changeScenarios: z.strictObject({
    businessChange: changeScenarioSchema,
    evolution: changeScenarioSchema,
  }),
});
export type DomainPack = z.infer<typeof domainPackSchema>;
