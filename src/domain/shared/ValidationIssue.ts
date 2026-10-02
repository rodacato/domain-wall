/**
 * A problem found while validating a domain pack. Issues are fed back to the LLM as context
 * when a generated pack is retried, so messages must be precise and written in English.
 */
export interface ValidationIssue {
  /** Stable identifier of the rule that produced the issue, for example "S05". */
  readonly ruleId: string;
  /** Dot-separated location inside the pack, for example "aggregates.Order.rules.PaymentMustMatchTotal". */
  readonly path: string;
  readonly message: string;
}

export function issueAt(
  ruleId: string,
  pathSegments: readonly string[],
  message: string,
): ValidationIssue {
  return { ruleId, path: pathSegments.join("."), message };
}
