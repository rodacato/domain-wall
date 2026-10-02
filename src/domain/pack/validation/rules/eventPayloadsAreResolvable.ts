import { issueAt, type ValidationIssue } from "../../../shared/ValidationIssue";
import { fieldTypesAreEqual, resolvePayloadSource } from "../../eventPayload";
import type { SemanticRule } from "../SemanticRule";

const RULE_ID = "S22";

/** Every payload field of an emitted event can be filled from the command or the aggregate, with the same type. */
export const eventPayloadsAreResolvable: SemanticRule = {
  id: RULE_ID,
  description: "event payload fields can be resolved when the event is emitted",
  check: (index) => {
    const issues: ValidationIssue[] = [];
    for (const aggregate of index.pack.aggregates) {
      for (const transition of aggregate.transitions) {
        const command = index.commands.get(transition.command);
        if (command === undefined) continue;
        for (const eventName of transition.emits) {
          const event = index.events.get(eventName);
          if (event === undefined) continue;
          for (const field of event.payload) {
            const at = [
              "aggregates",
              aggregate.codeName,
              "transitions",
              transition.command,
              eventName,
              field.codeName,
            ];
            const source = resolvePayloadSource(aggregate, command, field.codeName);
            if (source === undefined) {
              issues.push(
                issueAt(
                  RULE_ID,
                  at,
                  `payload field "${field.codeName}" is neither an argument of ${command.codeName} nor a field of ${aggregate.codeName}`,
                ),
              );
            } else if (!fieldTypesAreEqual(source.type, field.type)) {
              issues.push(
                issueAt(
                  RULE_ID,
                  at,
                  `payload field "${field.codeName}" has a different type than its ${source.kind}`,
                ),
              );
            }
          }
        }
      }
    }
    return issues;
  },
};
