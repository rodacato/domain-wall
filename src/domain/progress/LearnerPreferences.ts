import { z } from "zod";
import {
  PROGRAMMING_LANGUAGES,
  DEFAULT_PROGRAMMING_LANGUAGE,
} from "../language/ProgrammingLanguage";
import { SUPPORTED_LOCALES, CANONICAL_LOCALE } from "../locale/LocaleRegistry";

/** Which domain pack the course renders over. */
export const packSelectionSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("default") }),
  z.strictObject({ kind: z.literal("preset"), packId: z.string().min(1) }),
  z.strictObject({ kind: z.literal("generated"), packKey: z.string().min(1) }),
]);
export type PackSelection = z.infer<typeof packSelectionSchema>;

export const learnerPreferencesSchema = z.strictObject({
  locale: z.enum(SUPPORTED_LOCALES),
  programmingLanguage: z.enum(PROGRAMMING_LANGUAGES),
  pack: packSelectionSchema,
});
export type LearnerPreferences = z.infer<typeof learnerPreferencesSchema>;

export const DEFAULT_PREFERENCES: LearnerPreferences = {
  locale: CANONICAL_LOCALE,
  programmingLanguage: DEFAULT_PROGRAMMING_LANGUAGE,
  pack: { kind: "default" },
};
