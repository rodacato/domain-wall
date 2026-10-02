import { issueAt, type ValidationIssue } from "../../../shared/ValidationIssue";
import { describeRejection } from "../../interpreter/Rejection";
import { runScenario } from "../../interpreter/runScenario";
import type { SemanticRule } from "../SemanticRule";

const RULE_ID = "S02";

/**
 * Every rule is used, and its violation scenario is rejected by exactly that rule: the scenario
 * becomes a generated test, so it must demonstrably work.
 */
export const rulesAreViolable: SemanticRule = {
  id: RULE_ID,
  description: "every rule is used and its violation scenario is rejected by that rule",
  check: (index) => {
    const issues: ValidationIssue[] = [];
    for (const aggregate of index.pack.aggregates) {
      const guardNames = new Set<string>(
        aggregate.transitions.flatMap((transition) => transition.guards),
      );
      const invariantNames = new Set<string>(aggregate.invariants);
      for (const rule of aggregate.rules) {
        const at = ["aggregates", aggregate.codeName, "rules", rule.codeName];
        const isGuard = guardNames.has(rule.codeName);
        const isInvariant = invariantNames.has(rule.codeName);
        if (!isGuard && !isInvariant) {
          issues.push(
            issueAt(RULE_ID, at, "rule is neither a guard of a transition nor an invariant"),
          );
          continue;
        }
        const outcome = runScenario(index, aggregate.codeName, rule.violation);
        if (!outcome.ok) {
          issues.push(
            issueAt(RULE_ID, at, `violation scenario cannot be played: ${outcome.error.message}`),
          );
        } else if (outcome.value === null) {
          issues.push(
            issueAt(RULE_ID, at, "violation scenario was accepted, but it must be rejected"),
          );
        } else if (outcome.value.kind !== "ruleViolated" || outcome.value.rule !== rule.codeName) {
          issues.push(
            issueAt(
              RULE_ID,
              at,
              `violation scenario was rejected by something else: ${describeRejection(outcome.value)}`,
            ),
          );
        }
      }
    }
    return issues;
  },
};
