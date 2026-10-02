import { issueAt, type ValidationIssue } from "../../../shared/ValidationIssue";
import type { PackIndex } from "../../PackIndex";
import type { SemanticRule } from "../SemanticRule";

const RULE_ID = "S09";

/** Commands, policies and events fit together the way an Event Storming wall requires. */
export const eventStormingIsCoherent: SemanticRule = {
  id: RULE_ID,
  description:
    "commands have a coherent issuer and policies cross contexts only along the context map",
  check: (index) => {
    const issues: ValidationIssue[] = [];
    const { pack } = index;

    for (const command of pack.commands) {
      const at = ["commands", command.codeName];
      const aggregate = index.aggregates.get(command.handledBy);
      if (aggregate !== undefined && aggregate.context !== command.context) {
        issues.push(
          issueAt(
            RULE_ID,
            at,
            `command is in "${command.context}" but its aggregate "${aggregate.codeName}" is in "${aggregate.context}"`,
          ),
        );
      }
      if (command.issuedBy.kind === "policy") {
        const policy = index.policies.get(command.issuedBy.ref);
        if (policy !== undefined && policy.then !== command.codeName) {
          issues.push(
            issueAt(
              RULE_ID,
              at,
              `issued by policy "${policy.codeName}", but that policy triggers "${policy.then}"`,
            ),
          );
        }
      }
    }

    for (const policy of pack.policies) {
      const at = ["policies", policy.codeName];
      const command = index.commands.get(policy.then);
      const event = index.events.get(policy.when);
      if (command === undefined || event === undefined) continue;
      if (command.issuedBy.kind !== "policy" || command.issuedBy.ref !== policy.codeName) {
        issues.push(
          issueAt(
            RULE_ID,
            at,
            `command "${command.codeName}" must declare that it is issued by this policy`,
          ),
        );
      }
      if (command.context !== policy.context) {
        issues.push(
          issueAt(
            RULE_ID,
            at,
            `policy is in "${policy.context}" but triggers a command of "${command.context}"`,
          ),
        );
      }
      if (
        event.context !== policy.context &&
        !contextsAreConnected(index, event.context, policy.context, event.codeName)
      ) {
        issues.push(
          issueAt(
            RULE_ID,
            at,
            `"${event.context}" does not deliver "${event.codeName}" to "${policy.context}" in the context map`,
          ),
        );
      }
    }
    return issues;
  },
};

function contextsAreConnected(
  index: PackIndex,
  producer: string,
  consumer: string,
  eventName: string,
): boolean {
  return index.pack.contextRelations.some((relation) => {
    switch (relation.type) {
      case "upstreamDownstream":
        return (
          relation.upstream === producer &&
          relation.downstream === consumer &&
          relation.via.some((via) => via === eventName)
        );
      case "partnership":
      case "sharedKernel":
        return (
          (relation.a === producer && relation.b === consumer) ||
          (relation.a === consumer && relation.b === producer)
        );
      case "separateWays":
        return false;
    }
  });
}
