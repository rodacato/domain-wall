import { issueAt } from "../../../shared/ValidationIssue";
import type { SemanticRule } from "../SemanticRule";

const RULE_ID = "S14";

export const subdomainsAreClassified: SemanticRule = {
  id: RULE_ID,
  description: "there is at least one core subdomain",
  check: ({ pack }) =>
    pack.contexts.some((context) => context.subdomain.type === "core")
      ? []
      : [issueAt(RULE_ID, ["contexts"], "at least one context must be a core subdomain")],
};
