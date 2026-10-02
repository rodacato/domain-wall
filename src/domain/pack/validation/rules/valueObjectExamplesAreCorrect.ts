import { issueAt, type ValidationIssue } from "../../../shared/ValidationIssue";
import { describeRejection } from "../../interpreter/Rejection";
import {
  matchesScalarBase,
  satisfiesConstraint,
  validateValue,
} from "../../interpreter/validateValue";
import type { SemanticRule } from "../SemanticRule";

const RULE_ID = "S13";

/**
 * Valid examples satisfy every constraint and each invalid example breaks the constraint it is
 * attached to. These examples feed fixtures and boundary tests, so they must be trustworthy.
 */
export const valueObjectExamplesAreCorrect: SemanticRule = {
  id: RULE_ID,
  description: "value object examples respect their constraints",
  check: (index) => {
    const issues: ValidationIssue[] = [];
    for (const valueObject of index.pack.valueObjects) {
      const at = ["valueObjects", valueObject.codeName];
      if (valueObject.kind === "enum") continue;
      for (const [position, example] of valueObject.examples.valid.entries()) {
        const rejection = validateValue(
          index,
          { kind: "valueObject", ref: valueObject.codeName },
          example,
          `examples.valid[${position}]`,
        );
        if (rejection !== null) {
          issues.push(
            issueAt(
              RULE_ID,
              at,
              `valid example ${JSON.stringify(example)} is rejected: ${describeRejection(rejection)}`,
            ),
          );
        }
      }
      if (valueObject.kind !== "scalar") continue;
      for (const constraint of valueObject.constraints) {
        for (const example of constraint.invalidExamples) {
          if (!matchesScalarBase(valueObject, example)) {
            issues.push(
              issueAt(
                RULE_ID,
                [...at, constraint.errorCode],
                `invalid example ${JSON.stringify(example)} must be a ${valueObject.base}`,
              ),
            );
          } else if (satisfiesConstraint(constraint, example)) {
            issues.push(
              issueAt(
                RULE_ID,
                [...at, constraint.errorCode],
                `invalid example ${JSON.stringify(example)} actually satisfies the constraint`,
              ),
            );
          }
        }
      }
    }
    return issues;
  },
};
