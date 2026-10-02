import { z } from "zod";
import { localizedTextSchema } from "../../locale/LocalizedText";
import { typeNameSchema } from "../naming/CodeName";

/**
 * Places in the fixed syllabus where an expert conversation happens. The course template defines
 * the slots; every pack must fill all of them (rule S15).
 */
export const DIALOGUE_SLOTS = [
  "whyDdd.change",
  "ubiquity.intro",
  "ubiquity.ambiguity",
  "storming.kickoff",
  "storming.commands",
  "contexts.split",
  "contexts.mapping",
  "subdomains.focus",
  "tactical.aggregate",
  "functional.pipeline",
  "architecture.ports",
  "evolution.request",
] as const;
export type DialogueSlot = (typeof DIALOGUE_SLOTS)[number];

/** Inline reference to a pack concept inside dialogue text: `{{term:Order}}`. */
export const TERM_REFERENCE_PATTERN = /\{\{term:([A-Za-z0-9]+)\}\}/g;

export const dialogueLineSchema = z.strictObject({
  speaker: typeNameSchema,
  text: localizedTextSchema,
});
export type DialogueLine = z.infer<typeof dialogueLineSchema>;

export const dialoguesSchema = z.record(z.enum(DIALOGUE_SLOTS), z.array(dialogueLineSchema).min(2));
export type Dialogues = z.infer<typeof dialoguesSchema>;
