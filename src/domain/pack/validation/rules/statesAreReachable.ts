import { issueAt, type ValidationIssue } from "../../../shared/ValidationIssue";
import type { SemanticRule } from "../SemanticRule";

const RULE_ID = "S03";

/** The state machine has no unreachable states, no dead ends and no ambiguous transitions. */
export const statesAreReachable: SemanticRule = {
  id: RULE_ID,
  description: "every state is reachable and every non-terminal state can be left",
  check: ({ pack }) => {
    const issues: ValidationIssue[] = [];
    for (const aggregate of pack.aggregates) {
      const at = ["aggregates", aggregate.codeName];
      const reached = new Set<string>([aggregate.initialState]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const transition of aggregate.transitions) {
          if (transition.from.some((from) => reached.has(from)) && !reached.has(transition.to)) {
            reached.add(transition.to);
            grew = true;
          }
        }
      }
      for (const state of aggregate.states) {
        if (!reached.has(state.codeName)) {
          issues.push(
            issueAt(
              RULE_ID,
              [...at, "states", state.codeName],
              `state "${state.codeName}" cannot be reached from "${aggregate.initialState}"`,
            ),
          );
        }
        const leavingTransitions = aggregate.transitions.filter(
          (transition) =>
            transition.from.includes(state.codeName) && transition.to !== state.codeName,
        );
        if (!state.terminal && leavingTransitions.length === 0) {
          issues.push(
            issueAt(
              RULE_ID,
              [...at, "states", state.codeName],
              `non-terminal state "${state.codeName}" has no way out`,
            ),
          );
        }
        if (
          state.terminal &&
          aggregate.transitions.some((transition) => transition.from.includes(state.codeName))
        ) {
          issues.push(
            issueAt(
              RULE_ID,
              [...at, "states", state.codeName],
              `terminal state "${state.codeName}" has outgoing transitions`,
            ),
          );
        }
      }
      const pairs = new Set<string>();
      for (const transition of aggregate.transitions) {
        for (const from of transition.from) {
          const pair = `${transition.command}@${from}`;
          if (pairs.has(pair)) {
            issues.push(
              issueAt(
                RULE_ID,
                [...at, "transitions", transition.command],
                `command "${transition.command}" has more than one transition from "${from}"`,
              ),
            );
          }
          pairs.add(pair);
        }
      }
    }
    return issues;
  },
};
