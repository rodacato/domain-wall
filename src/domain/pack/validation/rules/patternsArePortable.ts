import { issueAt, type ValidationIssue } from "../../../shared/ValidationIssue";
import type { SemanticRule } from "../SemanticRule";

const RULE_ID = "S19";

/**
 * Patterns are matched against the whole value and must behave the same in JavaScript, Python and
 * Ruby, so only a portable subset is accepted: literals, character classes, groups, alternation
 * and quantifiers.
 */
const PORTABLE_PATTERN = /^[A-Za-z0-9_&\-[\]{}().+*?|\\:,/ ^]*$/;
const NON_PORTABLE_CONSTRUCTS: readonly { readonly pattern: RegExp; readonly reason: string }[] = [
  { pattern: /\(\?[=!<]/, reason: "lookarounds are not portable" },
  { pattern: /\(\?P?<[A-Za-z]/, reason: "named groups are not portable" },
  { pattern: /\\[1-9]/, reason: "back-references are not portable" },
  { pattern: /\\[pPbBAzZG]/, reason: "this escape has different meanings across languages" },
  { pattern: /^\^|\$$/, reason: "anchors are implicit: the whole value must match" },
];

export const patternsArePortable: SemanticRule = {
  id: RULE_ID,
  description: "value object patterns use only the portable regular-expression subset",
  check: ({ pack }) => {
    const issues: ValidationIssue[] = [];
    for (const valueObject of pack.valueObjects) {
      if (valueObject.kind !== "scalar") continue;
      for (const constraint of valueObject.constraints) {
        if (constraint.kind !== "pattern") continue;
        const at = ["valueObjects", valueObject.codeName, constraint.errorCode];
        if (!PORTABLE_PATTERN.test(constraint.value)) {
          issues.push(issueAt(RULE_ID, at, "pattern uses characters outside the portable subset"));
        }
        for (const construct of NON_PORTABLE_CONSTRUCTS) {
          if (construct.pattern.test(constraint.value))
            issues.push(issueAt(RULE_ID, at, construct.reason));
        }
        try {
          new RegExp(`^(?:${constraint.value})$`);
        } catch {
          issues.push(issueAt(RULE_ID, at, "pattern is not a valid regular expression"));
        }
      }
    }
    return issues;
  },
};
