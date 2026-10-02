/**
 * The single source of truth for supported spoken languages (see ADR 6).
 * Adding a language starts here: the pack schema, the language selector and the translation
 * parity checks are all derived from this list.
 */
export const SUPPORTED_LOCALES = ["es-MX", "en"] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number];

/** Code-level messages, comments and identifiers are always written in this locale. */
export const CANONICAL_LOCALE: LocaleCode = "en";

export function isSupportedLocale(candidate: string): candidate is LocaleCode {
  return (SUPPORTED_LOCALES as readonly string[]).includes(candidate);
}

/**
 * Picks the supported locale closest to the user's preferences, for example the browser's
 * `navigator.languages`. Falls back to the canonical locale.
 */
export function negotiateLocale(preferredLanguageTags: readonly string[]): LocaleCode {
  for (const tag of preferredLanguageTags) {
    if (isSupportedLocale(tag)) return tag;
    const primaryLanguage = tag.split("-")[0]?.toLowerCase();
    const sameLanguage = SUPPORTED_LOCALES.find(
      (locale) => locale.split("-")[0]?.toLowerCase() === primaryLanguage,
    );
    if (sameLanguage !== undefined) return sameLanguage;
  }
  return CANONICAL_LOCALE;
}
