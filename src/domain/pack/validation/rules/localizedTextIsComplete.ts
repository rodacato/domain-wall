import { SUPPORTED_LOCALES } from "../../../locale/LocaleRegistry";
import { issueAt, type ValidationIssue } from "../../../shared/ValidationIssue";
import { TERM_REFERENCE_PATTERN } from "../../schema/Dialogue";
import type { SemanticRule } from "../SemanticRule";

const RULE_ID = "S08";
// Case matters: "todo" is an ordinary Spanish word, "TODO" is a marker.
const PLACEHOLDER_MARKERS = /\b(?:TODO|TBD|FIXME|XXX)\b|\?\?\?|lorem ipsum/;
const MINIMUM_LENGTH_TO_EXPECT_TRANSLATION = 25;

/** Every visible text exists in every supported locale and looks finished. */
export const localizedTextIsComplete: SemanticRule = {
  id: RULE_ID,
  description: "all labels and texts are complete in every supported locale",
  check: ({ pack }) => {
    const issues: ValidationIssue[] = [];

    const declaredLocales = new Set<string>(pack.meta.locales);
    for (const locale of SUPPORTED_LOCALES) {
      if (!declaredLocales.has(locale)) {
        issues.push(
          issueAt(
            RULE_ID,
            ["meta", "locales"],
            `the pack does not declare the supported locale "${locale}"`,
          ),
        );
      }
    }

    for (const { path, text } of findLocalizedTexts(pack, [])) {
      const at = path;
      for (const locale of SUPPORTED_LOCALES) {
        const value = text[locale] ?? "";
        if (PLACEHOLDER_MARKERS.test(value) || /lorem ipsum/i.test(value))
          issues.push(issueAt(RULE_ID, at, `${locale} text looks like a placeholder: "${value}"`));
        const withoutTerms = value.replace(TERM_REFERENCE_PATTERN, "");
        if (/[{}]/.test(withoutTerms)) {
          issues.push(
            issueAt(
              RULE_ID,
              at,
              `${locale} text has braces that are not a {{term:Name}} reference`,
            ),
          );
        }
      }
      const values = SUPPORTED_LOCALES.map((locale) => text[locale] ?? "");
      const [first] = values;
      if (
        first !== undefined &&
        first.length >= MINIMUM_LENGTH_TO_EXPECT_TRANSLATION &&
        values.every((value) => value === first)
      ) {
        issues.push(
          issueAt(
            RULE_ID,
            at,
            "the text is identical in every locale; it was probably not translated",
          ),
        );
      }
    }
    return issues;
  },
};

interface FoundText {
  readonly path: readonly string[];
  readonly text: Readonly<Record<string, string>>;
}

function findLocalizedTexts(node: unknown, path: readonly string[]): FoundText[] {
  if (Array.isArray(node))
    return node.flatMap((child, position) =>
      findLocalizedTexts(child, [...path, String(position)]),
    );
  if (typeof node !== "object" || node === null) return [];
  const record = node as Record<string, unknown>;
  if (isLocalizedText(record)) return [{ path, text: record as Record<string, string> }];
  return Object.entries(record).flatMap(([key, child]) =>
    findLocalizedTexts(child, [...path, key]),
  );
}

function isLocalizedText(record: Record<string, unknown>): boolean {
  const keys = Object.keys(record);
  return (
    keys.length === SUPPORTED_LOCALES.length &&
    SUPPORTED_LOCALES.every((locale) => typeof record[locale] === "string")
  );
}
