import { issueAt, type ValidationIssue } from "../../../shared/ValidationIssue";
import { findState } from "../../PackIndex";
import { runWalkthrough } from "../../interpreter/runScenario";
import type { SemanticRule } from "../SemanticRule";

const RULE_ID = "S18";

/** Each aggregate's happy path is accepted from start to finish and ends in a terminal state. */
export const walkthroughsAreAccepted: SemanticRule = {
  id: RULE_ID,
  description: "every walkthrough is accepted and ends in a terminal state",
  check: (index) => {
    const issues: ValidationIssue[] = [];
    for (const aggregate of index.pack.aggregates) {
      const at = ["aggregates", aggregate.codeName, "walkthrough"];
      const outcome = runWalkthrough(index, aggregate.codeName, aggregate.walkthrough);
      if (!outcome.ok) {
        issues.push(issueAt(RULE_ID, at, outcome.error.message));
        continue;
      }
      const finalState = findState(aggregate, outcome.value.finalInstance.state);
      if (finalState?.terminal !== true) {
        issues.push(
          issueAt(
            RULE_ID,
            at,
            `walkthrough ends in "${outcome.value.finalInstance.state}", which is not a terminal state`,
          ),
        );
      }
    }
    return issues;
  },
};
