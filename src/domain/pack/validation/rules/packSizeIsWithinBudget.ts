import { SUPPORTED_LOCALES } from "../../../locale/LocaleRegistry";
import { issueAt, type ValidationIssue } from "../../../shared/ValidationIssue";
import type { SemanticRule } from "../SemanticRule";

const RULE_ID = "S16";

const BUDGET = {
  events: { minimum: 8, maximum: 30 },
  contexts: { minimum: 2, maximum: 5 },
  aggregates: { minimum: 1, maximum: 6 },
  commands: { minimum: 4, maximum: 40 },
  valueObjects: { minimum: 1, maximum: 40 },
} as const;
const MAXIMUM_NOTE_LABEL_LENGTH = 60;
const MAXIMUM_DESCRIPTION_LENGTH = 300;
const MAXIMUM_DIALOGUE_LINE_LENGTH = 400;

/** The wall has to stay legible: bounded counts, and labels short enough to fit on a sticky note. */
export const packSizeIsWithinBudget: SemanticRule = {
  id: RULE_ID,
  description: "counts and text lengths fit the wall",
  check: ({ pack }) => {
    const issues: ValidationIssue[] = [];
    const counts = {
      events: pack.events.length,
      contexts: pack.contexts.length,
      aggregates: pack.aggregates.length,
      commands: pack.commands.length,
      valueObjects: pack.valueObjects.length,
    };
    for (const [name, { minimum, maximum }] of Object.entries(BUDGET)) {
      const count = counts[name as keyof typeof counts];
      if (count < minimum || count > maximum) {
        issues.push(
          issueAt(RULE_ID, [name], `${count} ${name}; expected between ${minimum} and ${maximum}`),
        );
      }
    }

    const noteConcepts = [
      ...pack.events.map((concept) => ({ path: ["events", concept.codeName], concept })),
      ...pack.commands.map((concept) => ({ path: ["commands", concept.codeName], concept })),
      ...pack.policies.map((concept) => ({ path: ["policies", concept.codeName], concept })),
      ...pack.actors.map((concept) => ({ path: ["actors", concept.codeName], concept })),
      ...pack.externalSystems.map((concept) => ({
        path: ["externalSystems", concept.codeName],
        concept,
      })),
      ...pack.readModels.map((concept) => ({ path: ["readModels", concept.codeName], concept })),
      ...pack.aggregates.map((concept) => ({ path: ["aggregates", concept.codeName], concept })),
      ...pack.contexts.map((concept) => ({ path: ["contexts", concept.codeName], concept })),
    ];
    for (const { path, concept } of noteConcepts) {
      for (const locale of SUPPORTED_LOCALES) {
        if (concept.label[locale].length > MAXIMUM_NOTE_LABEL_LENGTH) {
          issues.push(
            issueAt(
              RULE_ID,
              path,
              `${locale} label is longer than ${MAXIMUM_NOTE_LABEL_LENGTH} characters`,
            ),
          );
        }
        if (concept.description[locale].length > MAXIMUM_DESCRIPTION_LENGTH) {
          issues.push(
            issueAt(
              RULE_ID,
              path,
              `${locale} description is longer than ${MAXIMUM_DESCRIPTION_LENGTH} characters`,
            ),
          );
        }
      }
    }
    for (const [slot, lines] of Object.entries(pack.dialogues)) {
      for (const [position, line] of lines.entries()) {
        for (const locale of SUPPORTED_LOCALES) {
          if (line.text[locale].length > MAXIMUM_DIALOGUE_LINE_LENGTH) {
            issues.push(
              issueAt(
                RULE_ID,
                ["dialogues", slot, String(position)],
                `${locale} line is longer than ${MAXIMUM_DIALOGUE_LINE_LENGTH} characters`,
              ),
            );
          }
        }
      }
    }
    return issues;
  },
};
