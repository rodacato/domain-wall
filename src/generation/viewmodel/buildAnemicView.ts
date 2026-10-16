import type { PackIndex } from "../../domain/pack/PackIndex";
import type { Aggregate } from "../../domain/pack/schema/Aggregate";
import { anemicDescriptorOf } from "../languages/anemic";
import type { LanguageDescriptor } from "../languages/LanguageDescriptor";
import { buildAggregateView, type AggregateView } from "./buildAggregateView";
import { namingFor } from "./LanguageNaming";

export interface AnemicView extends AggregateView {
  readonly dataType: string;
  readonly anemicAnchor: string;
  /** What the aggregate promised and this style leaves to every caller to remember. */
  readonly forgotten: readonly { readonly rule: string }[];
}

/** The same aggregate as plain data plus functions that each repeat the rules they remember. */
export function buildAnemicView(
  index: PackIndex,
  descriptor: LanguageDescriptor,
  aggregate: Aggregate,
): AnemicView {
  const view = buildAggregateView(index, anemicDescriptorOf(descriptor), aggregate);
  const naming = namingFor(descriptor.id);
  return {
    ...view,
    dataType: `${view.name}Data`,
    anemicAnchor: `${aggregate.codeName}.anemic`,
    forgotten: aggregate.invariants.map((rule) => ({ rule: naming.errorCode(rule) })),
  };
}
