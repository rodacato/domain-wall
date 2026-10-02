import { z } from "zod";

/**
 * Stable identifier of a teachable concept, for example "tactical.value-object". Progress is stored
 * per concept id, so it survives changes of industry, programming language and spoken language.
 */
export const CONCEPT_ID_PATTERN = /^[a-z]+\.[a-z]+(?:-[a-z]+)*$/;

export const conceptIdSchema = z
  .string()
  .regex(CONCEPT_ID_PATTERN, "concept ids look like 'group.kebab-name'")
  .brand<"ConceptId">();
export type ConceptId = z.infer<typeof conceptIdSchema>;

export const MODULE_ID_PATTERN = /^[a-z]+(?:-[a-z]+)*$/;

export const moduleIdSchema = z
  .string()
  .regex(MODULE_ID_PATTERN, "module ids are kebab-case words")
  .brand<"ModuleId">();
export type ModuleId = z.infer<typeof moduleIdSchema>;
