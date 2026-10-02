import type { DomainPack } from "../schema/DomainPack";

/** Code names that a `{{term:Name}}` reference in a dialogue may point to. */
export function conceptNamesOf(pack: DomainPack): ReadonlySet<string> {
  return new Set<string>([
    pack.business.codeName,
    pack.ambiguousTerm.codeName,
    ...pack.actors.map((concept) => concept.codeName),
    ...pack.externalSystems.map((concept) => concept.codeName),
    ...pack.contexts.map((concept) => concept.codeName),
    ...pack.policies.map((concept) => concept.codeName),
    ...pack.events.map((concept) => concept.codeName),
    ...pack.commands.map((concept) => concept.codeName),
    ...pack.readModels.map((concept) => concept.codeName),
    ...pack.valueObjects.map((concept) => concept.codeName),
    ...pack.aggregates.flatMap((aggregate) => [
      aggregate.codeName,
      ...aggregate.entities.map((entity) => entity.codeName),
    ]),
  ]);
}
