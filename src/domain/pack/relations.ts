import type { LocalizedText } from "../locale/LocalizedText";
import type { PackIndex } from "./PackIndex";
import type { ContextPattern, ContextRelation } from "./schema/Strategy";

/** The context-mapping patterns a relation expresses. */
export function patternsOfRelation(relation: ContextRelation): readonly ContextPattern[] {
  switch (relation.type) {
    case "upstreamDownstream":
      return [
        ...relation.upstreamRoles,
        ...relation.downstreamRoles,
        ...(relation.customerSupplier ? (["CustomerSupplier"] as const) : []),
      ];
    case "partnership":
      return ["Partnership"];
    case "sharedKernel":
      return ["SharedKernel"];
    case "separateWays":
      return ["SeparateWays"];
  }
}

/** The two contexts a relation joins, upstream or first first. */
export function contextsOfRelation(relation: ContextRelation): readonly [string, string] {
  return relation.type === "upstreamDownstream"
    ? [relation.upstream, relation.downstream]
    : [relation.a, relation.b];
}

export interface PatternExample {
  readonly from: string;
  readonly to: string;
  readonly description: LocalizedText;
}

/** Where the pack uses a pattern: its context relations and, for the anti-corruption layer, the external system it guards against. */
export function patternExamples(
  index: PackIndex,
  pattern: ContextPattern,
): readonly PatternExample[] {
  const fromRelations = index.pack.contextRelations
    .filter((relation) => patternsOfRelation(relation).includes(pattern))
    .map((relation) => {
      const [from, to] = contextsOfRelation(relation);
      return { from, to, description: relation.description };
    });
  if (pattern !== "AntiCorruptionLayer") return fromRelations;
  const layer = index.pack.antiCorruptionLayer;
  const root = layer.externalTypes.find((type) => type.codeName === layer.externalRoot);
  return [
    ...fromRelations,
    {
      from: layer.externalSystem,
      to: layer.context,
      description: root?.description ?? index.pack.business.description,
    },
  ];
}
