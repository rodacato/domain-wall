import { issueAt, type ValidationIssue } from "../../../shared/ValidationIssue";
import type { SemanticRule } from "../SemanticRule";

const RULE_ID = "S10";
const MINIMUM_DISTINCT_PATTERNS = 3;

/** The context map shows several distinct patterns, always including the anti-corruption layer. */
export const contextMapIsRich: SemanticRule = {
  id: RULE_ID,
  description: "the context map uses at least three distinct patterns and connects every context",
  check: ({ pack }) => {
    const issues: ValidationIssue[] = [];
    const patterns = new Set<string>(["AntiCorruptionLayer"]);
    const connected = new Set<string>();

    for (const [position, relation] of pack.contextRelations.entries()) {
      const at = ["contextRelations", String(position)];
      if (relation.type === "upstreamDownstream") {
        if (relation.upstream === relation.downstream)
          issues.push(issueAt(RULE_ID, at, "a relation needs two different contexts"));
        connected.add(relation.upstream).add(relation.downstream);
        relation.upstreamRoles.forEach((role) => patterns.add(role));
        relation.downstreamRoles.forEach((role) => patterns.add(role));
        if (relation.customerSupplier) patterns.add("CustomerSupplier");
      } else {
        if (relation.a === relation.b)
          issues.push(issueAt(RULE_ID, at, "a relation needs two different contexts"));
        connected.add(relation.a).add(relation.b);
        patterns.add(relation.type);
      }
    }
    if (patterns.size < MINIMUM_DISTINCT_PATTERNS) {
      issues.push(
        issueAt(
          RULE_ID,
          ["contextRelations"],
          `the map uses ${patterns.size} patterns; at least ${MINIMUM_DISTINCT_PATTERNS} are needed`,
        ),
      );
    }
    for (const context of pack.contexts) {
      if (!connected.has(context.codeName)) {
        issues.push(
          issueAt(
            RULE_ID,
            ["contexts", context.codeName],
            "context takes part in no relation of the context map",
          ),
        );
      }
    }
    return issues;
  },
};
