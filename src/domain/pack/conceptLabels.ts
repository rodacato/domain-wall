import type { LocalizedText } from "../locale/LocalizedText";
import type { PackIndex } from "./PackIndex";

/** The display label of any named concept of the pack, or undefined if the name is unknown. */
export function labelOfConcept(index: PackIndex, codeName: string): LocalizedText | undefined {
  const { pack } = index;
  if (pack.ambiguousTerm.codeName === codeName) return pack.ambiguousTerm.label;
  return (
    index.aggregates.get(codeName)?.label ??
    index.entities.get(codeName)?.entity.label ??
    index.valueObjects.get(codeName)?.label ??
    index.events.get(codeName)?.label ??
    index.commands.get(codeName)?.label ??
    index.policies.get(codeName)?.label ??
    index.contexts.get(codeName)?.label ??
    index.actors.get(codeName)?.label ??
    index.externalSystems.get(codeName)?.label ??
    pack.readModels.find((readModel) => readModel.codeName === codeName)?.label
  );
}

/** The one-line description of a named concept, when the pack gives one. */
export function descriptionOfConcept(
  index: PackIndex,
  codeName: string,
): LocalizedText | undefined {
  const { pack } = index;
  return (
    index.aggregates.get(codeName)?.description ??
    index.entities.get(codeName)?.entity.description ??
    index.valueObjects.get(codeName)?.description ??
    index.events.get(codeName)?.description ??
    index.commands.get(codeName)?.description ??
    index.policies.get(codeName)?.description ??
    index.contexts.get(codeName)?.description ??
    index.actors.get(codeName)?.description ??
    index.externalSystems.get(codeName)?.description ??
    pack.readModels.find((readModel) => readModel.codeName === codeName)?.description
  );
}
