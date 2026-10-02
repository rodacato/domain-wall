import { z } from "zod";
import { SUPPORTED_LOCALES, type LocaleCode } from "./LocaleRegistry";

const visibleText = z
  .string()
  .refine((text) => text.trim().length > 0, "text must not be blank")
  .refine((text) => text === text.trim(), "text must not have leading or trailing whitespace");

/** Text with one entry per supported locale. Every locale is required. */
export type LocalizedText = Readonly<Record<LocaleCode, string>>;

export const localizedTextSchema: z.ZodType<LocalizedText> = z.strictObject(
  Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, visibleText])) as Record<
    LocaleCode,
    typeof visibleText
  >,
);

export function textIn(text: LocalizedText, locale: LocaleCode): string {
  return text[locale];
}
