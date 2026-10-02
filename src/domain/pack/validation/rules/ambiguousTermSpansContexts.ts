import { issueAt, type ValidationIssue } from "../../../shared/ValidationIssue";
import { SUPPORTED_LOCALES } from "../../../locale/LocaleRegistry";
import type { PackIndex } from "../../PackIndex";
import type { SemanticRule } from "../SemanticRule";

const RULE_ID = "S05";

/** The ambiguous term must mean something different in at least two contexts: that is the point of the lesson. */
export const ambiguousTermSpansContexts: SemanticRule = {
  id: RULE_ID,
  description: "the ambiguous term has distinct meanings in at least two contexts",
  check: (index) => {
    const issues: ValidationIssue[] = [];
    const { meanings } = index.pack.ambiguousTerm;
    const at = ["ambiguousTerm"];

    if (new Set(meanings.map((meaning) => meaning.context)).size < 2) {
      issues.push(issueAt(RULE_ID, at, "the term must appear in at least two different contexts"));
    }
    if (new Set(meanings.map((meaning) => meaning.context)).size !== meanings.length) {
      issues.push(issueAt(RULE_ID, at, "each context may give the term only one meaning"));
    }
    if (new Set(meanings.map((meaning) => meaning.concept)).size !== meanings.length) {
      issues.push(issueAt(RULE_ID, at, "each meaning must use a different local concept"));
    }
    for (const locale of SUPPORTED_LOCALES) {
      const definitions = meanings.map((meaning) =>
        meaning.definition[locale].trim().toLowerCase(),
      );
      if (new Set(definitions).size !== definitions.length) {
        issues.push(issueAt(RULE_ID, at, `two meanings share the same definition in ${locale}`));
      }
    }
    for (const meaning of meanings) {
      const meaningPath = [...at, meaning.context];
      if (!conceptBelongsToContext(index, meaning.concept, meaning.context)) {
        issues.push(
          issueAt(
            RULE_ID,
            meaningPath,
            `concept "${meaning.concept}" is not part of context "${meaning.context}"`,
          ),
        );
      }
      const availableFields = fieldNamesOfConcept(index, meaning.concept);
      for (const fieldName of meaning.showcaseFields) {
        if (!availableFields.has(fieldName)) {
          issues.push(
            issueAt(
              RULE_ID,
              meaningPath,
              `showcase field "${fieldName}" is not a field of "${meaning.concept}"`,
            ),
          );
        }
      }
    }
    return issues;
  },
};

function conceptBelongsToContext(index: PackIndex, concept: string, context: string): boolean {
  const aggregate = index.aggregates.get(concept);
  if (aggregate !== undefined) return aggregate.context === context;
  const entity = index.entities.get(concept);
  if (entity !== undefined) return entity.aggregate.context === context;
  if (!index.valueObjects.has(concept)) return false;
  const usedByAggregate = index.pack.aggregates.some(
    (candidate) =>
      candidate.context === context &&
      [...candidate.fields, ...candidate.states.flatMap((state) => state.data)].some((field) =>
        typeMentions(field.type, concept),
      ),
  );
  const usedByCommand = index.pack.commands.some(
    (command) =>
      command.context === context &&
      command.params.some((param) => typeMentions(param.type, concept)),
  );
  return usedByAggregate || usedByCommand;
}

function typeMentions(
  type: PackIndex["pack"]["aggregates"][number]["fields"][number]["type"],
  concept: string,
): boolean {
  switch (type.kind) {
    case "primitive":
      return false;
    case "valueObject":
    case "entity":
      return type.ref === concept;
    case "list":
    case "optional":
      return typeMentions(type.of, concept);
  }
}

function fieldNamesOfConcept(index: PackIndex, concept: string): ReadonlySet<string> {
  const aggregate = index.aggregates.get(concept);
  if (aggregate !== undefined)
    return new Set([...aggregate.fields, ...aggregate.derived].map((field) => field.codeName));
  const entity = index.entities.get(concept)?.entity;
  if (entity !== undefined)
    return new Set([...entity.fields, ...entity.derived].map((field) => field.codeName));
  const valueObject = index.valueObjects.get(concept);
  if (valueObject?.kind === "record")
    return new Set(valueObject.fields.map((field) => field.codeName));
  return new Set();
}
