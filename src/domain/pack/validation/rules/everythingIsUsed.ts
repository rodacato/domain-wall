import { issueAt, type ValidationIssue } from "../../../shared/ValidationIssue";
import type { FieldType } from "../../schema/FieldType";
import type { SemanticRule } from "../SemanticRule";

const RULE_ID = "S04";

/** Nothing in the pack is dead weight, and transitions respect the ownership of commands and events. */
export const everythingIsUsed: SemanticRule = {
  id: RULE_ID,
  description: "commands, events and value objects are used and owned consistently",
  check: (index) => {
    const { pack } = index;
    const issues: ValidationIssue[] = [];

    const commandsInTransitions = new Set<string>();
    const eventsEmitted = new Set<string>();
    for (const aggregate of pack.aggregates) {
      for (const transition of aggregate.transitions) {
        const at = ["aggregates", aggregate.codeName, "transitions", transition.command];
        commandsInTransitions.add(transition.command);
        const command = index.commands.get(transition.command);
        if (command !== undefined && command.handledBy !== aggregate.codeName) {
          issues.push(
            issueAt(
              RULE_ID,
              at,
              `command is handled by "${command.handledBy}", not by "${aggregate.codeName}"`,
            ),
          );
        }
        for (const eventName of transition.emits) {
          eventsEmitted.add(eventName);
          const event = index.events.get(eventName);
          if (event !== undefined && event.context !== aggregate.context) {
            issues.push(
              issueAt(
                RULE_ID,
                at,
                `event "${eventName}" belongs to "${event.context}" but "${aggregate.codeName}" lives in "${aggregate.context}"`,
              ),
            );
          }
        }
      }
    }
    for (const command of pack.commands) {
      if (!commandsInTransitions.has(command.codeName)) {
        issues.push(
          issueAt(RULE_ID, ["commands", command.codeName], "command is not used by any transition"),
        );
      }
    }
    for (const event of pack.events) {
      if (!eventsEmitted.has(event.codeName)) {
        issues.push(
          issueAt(RULE_ID, ["events", event.codeName], "event is not emitted by any transition"),
        );
      }
    }

    const referencedValueObjects = new Set<string>();
    const collect = (type: FieldType): void => {
      if (type.kind === "valueObject") referencedValueObjects.add(type.ref);
      else if (type.kind === "list" || type.kind === "optional") collect(type.of);
    };
    const allFields = [
      ...pack.events.flatMap((event) => event.payload),
      ...pack.commands.flatMap((command) => command.params),
      ...pack.readModels.flatMap((readModel) => readModel.fields),
      ...pack.valueObjects.flatMap((valueObject) =>
        valueObject.kind === "record" ? valueObject.fields : [],
      ),
      ...pack.aggregates.flatMap((aggregate) => [
        ...aggregate.fields,
        ...aggregate.derived,
        ...aggregate.states.flatMap((state) => state.data),
        ...aggregate.entities.flatMap((entity) => [...entity.fields, ...entity.derived]),
      ]),
      ...pack.workflow.intermediateTypes.flatMap((type) => type.fields),
    ];
    for (const field of allFields) collect(field.type);
    for (const valueObject of pack.valueObjects) {
      if (!referencedValueObjects.has(valueObject.codeName)) {
        issues.push(
          issueAt(
            RULE_ID,
            ["valueObjects", valueObject.codeName],
            "value object is not used by any field or parameter",
          ),
        );
      }
    }
    return issues;
  },
};
