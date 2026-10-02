import { issueAt, type ValidationIssue } from "../shared/ValidationIssue";
import { CANONICAL_LOCALE, SUPPORTED_LOCALES, type LocaleCode } from "./LocaleRegistry";

/** A translation catalog flattened to dot-separated keys, for example "onboarding.language.title". */
export type FlatCatalog = Readonly<Record<string, string>>;

const RULE_ID = "i18n";
const PLACEHOLDER_PATTERN = /\{\s*([A-Za-z0-9_]+)\s*(?:,[^}]*)?\}/g;

/** Turns nested JSON into a flat catalog; non-string leaves are ignored by the caller's schema. */
export function flattenCatalog(node: unknown, prefix = ""): FlatCatalog {
  if (typeof node === "string") return { [prefix]: node };
  if (typeof node !== "object" || node === null) return {};
  return Object.fromEntries(
    Object.entries(node).flatMap(([key, child]) =>
      Object.entries(flattenCatalog(child, prefix === "" ? key : `${prefix}.${key}`)),
    ),
  );
}

function placeholdersOf(message: string): readonly string[] {
  return [...message.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1] ?? "").sort();
}

/**
 * Compares every locale's catalog against the canonical one: no missing keys, no extra keys, no
 * blank messages, and the same ICU placeholders in each message.
 */
export function compareCatalogs(
  catalogsByLocale: Readonly<Record<LocaleCode, FlatCatalog>>,
  namespace: string,
): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const canonical = catalogsByLocale[CANONICAL_LOCALE];

  for (const locale of SUPPORTED_LOCALES) {
    if (locale === CANONICAL_LOCALE) continue;
    const catalog = catalogsByLocale[locale];
    for (const key of Object.keys(canonical)) {
      const translated = catalog[key];
      if (translated === undefined) {
        issues.push(issueAt(RULE_ID, [namespace, locale, key], "missing translation"));
        continue;
      }
      if (translated.trim().length === 0)
        issues.push(issueAt(RULE_ID, [namespace, locale, key], "blank translation"));
      const expected = placeholdersOf(canonical[key] ?? "").join(",");
      if (placeholdersOf(translated).join(",") !== expected) {
        issues.push(
          issueAt(
            RULE_ID,
            [namespace, locale, key],
            `placeholders differ from ${CANONICAL_LOCALE} (expected: ${expected || "none"})`,
          ),
        );
      }
    }
    for (const key of Object.keys(catalog)) {
      if (!(key in canonical))
        issues.push(
          issueAt(RULE_ID, [namespace, locale, key], `key does not exist in ${CANONICAL_LOCALE}`),
        );
    }
  }
  return issues;
}
