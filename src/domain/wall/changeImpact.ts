import type { LocalizedText } from "../locale/LocalizedText";
import type { PackIndex } from "../pack/PackIndex";

/** Where a business rule ends up copied in an anemic design: one place per entry point that touches the aggregate. */
export const ANEMIC_PLACES = ["web", "service", "adminTool", "importJob", "api", "report"] as const;
export type AnemicPlace = (typeof ANEMIC_PLACES)[number];

/** The place the team forgets to change, which is how a copied rule becomes a bug. */
export const FORGOTTEN_PLACE: AnemicPlace = "report";

export interface ChangeImpact {
  readonly story: LocalizedText;
  readonly aggregate: string;
  readonly command: string;
  readonly statesBefore: readonly string[];
  readonly statesAfter: readonly string[];
}

/** What the pack's business change does to one transition, so the course can show where that change lands. */
export function changeImpactOf(index: PackIndex): ChangeImpact | undefined {
  const { businessChange } = index.pack.changeScenarios;
  const restriction = businessChange.patch.find(
    (operation) => operation.op === "restrictTransition",
  );
  if (restriction === undefined) return undefined;
  const aggregate = index.aggregates.get(restriction.aggregate);
  const transition = aggregate?.transitions.find(
    (candidate) => candidate.command === restriction.command,
  );
  if (transition === undefined) return undefined;
  return {
    story: businessChange.story,
    aggregate: restriction.aggregate,
    command: restriction.command,
    statesBefore: transition.from,
    statesAfter: transition.from.filter(
      (state) => !restriction.removeFrom.some((removed) => removed === state),
    ),
  };
}
