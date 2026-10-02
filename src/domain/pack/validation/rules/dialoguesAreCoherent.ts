import { SUPPORTED_LOCALES } from "../../../locale/LocaleRegistry";
import { issueAt, type ValidationIssue } from "../../../shared/ValidationIssue";
import { TERM_REFERENCE_PATTERN } from "../../schema/Dialogue";
import { conceptNamesOf } from "../conceptNames";
import type { SemanticRule } from "../SemanticRule";

const RULE_ID = "S15";

/** Dialogue terms refer to real concepts, and every locale mentions the same terms. */
export const dialoguesAreCoherent: SemanticRule = {
  id: RULE_ID,
  description: "dialogue term references exist and match across locales",
  check: ({ pack }) => {
    const issues: ValidationIssue[] = [];
    const concepts = conceptNamesOf(pack);
    for (const [slot, lines] of Object.entries(pack.dialogues)) {
      for (const [position, line] of lines.entries()) {
        const at = ["dialogues", slot, String(position)];
        const termsByLocale = SUPPORTED_LOCALES.map((locale) => ({
          locale,
          terms: [...line.text[locale].matchAll(TERM_REFERENCE_PATTERN)].map(
            (match) => match[1] ?? "",
          ),
        }));
        for (const { locale, terms } of termsByLocale) {
          for (const term of terms) {
            if (!concepts.has(term))
              issues.push(issueAt(RULE_ID, at, `${locale} text references unknown term "${term}"`));
          }
        }
        const reference = [...(termsByLocale[0]?.terms ?? [])].sort().join(",");
        for (const { locale, terms } of termsByLocale) {
          if ([...terms].sort().join(",") !== reference) {
            issues.push(
              issueAt(
                RULE_ID,
                at,
                `${locale} text mentions different terms than ${termsByLocale[0]?.locale ?? "the first locale"}`,
              ),
            );
          }
        }
      }
    }
    return issues;
  },
};
