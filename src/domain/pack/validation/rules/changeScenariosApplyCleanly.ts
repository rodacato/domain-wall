import { issueAt, type ValidationIssue } from "../../../shared/ValidationIssue";
import { buildPackIndex } from "../../PackIndex";
import { applyPatch } from "../../patch/applyPatch";
import type { SemanticRule } from "../SemanticRule";

const RULE_ID = "S17";

/**
 * A business change must produce a pack that is itself valid: the course animates the change and
 * regenerates code from the patched pack. Built from the other rules, which it re-runs.
 */
export function changeScenariosApplyCleanly(otherRules: readonly SemanticRule[]): SemanticRule {
  return {
    id: RULE_ID,
    description: "every change scenario produces a valid pack",
    check: (index) => {
      const issues: ValidationIssue[] = [];
      for (const [name, scenario] of Object.entries(index.pack.changeScenarios)) {
        const at = ["changeScenarios", name];
        const patched = applyPatch(index.pack, scenario.patch);
        if (!patched.ok) {
          issues.push(
            ...patched.error.map((issue) => issueAt(RULE_ID, [...at, issue.path], issue.message)),
          );
          continue;
        }
        const patchedIndex = buildPackIndex(patched.value);
        for (const rule of otherRules) {
          for (const issue of rule.check(patchedIndex)) {
            issues.push(
              issueAt(
                RULE_ID,
                [...at, issue.path],
                `after the change, ${issue.ruleId}: ${issue.message}`,
              ),
            );
          }
        }
      }
      return issues;
    },
  };
}
