import type { LocalizedText } from "../locale/LocalizedText";
import type { PackIndex } from "../pack/PackIndex";
import { labelOfConcept } from "../pack/conceptLabels";

/** What the floating term note shows while it sits inside one context. */
export interface TermFace {
  readonly concept: string;
  readonly title: LocalizedText;
  readonly definition: LocalizedText;
  readonly fields: readonly LocalizedText[];
}

/** The face of the ambiguous term in a context, or undefined if the term has no meaning there. */
export function termFaceIn(index: PackIndex, context: string): TermFace | undefined {
  const meaning = index.pack.ambiguousTerm.meanings.find(
    (candidate) => candidate.context === context,
  );
  if (meaning === undefined) return undefined;
  const title = labelOfConcept(index, meaning.concept);
  if (title === undefined) return undefined;

  const aggregate = index.aggregates.get(meaning.concept);
  const entity = index.entities.get(meaning.concept)?.entity;
  const valueObject = index.valueObjects.get(meaning.concept);
  const available = [
    ...(aggregate ? [...aggregate.fields, ...aggregate.derived] : []),
    ...(entity ? [...entity.fields, ...entity.derived] : []),
    ...(valueObject?.kind === "record" ? valueObject.fields : []),
  ];
  const fields = meaning.showcaseFields.flatMap((name) => {
    const field = available.find((candidate) => candidate.codeName === name);
    return field === undefined ? [] : [field.label];
  });
  return { concept: meaning.concept, title, definition: meaning.definition, fields };
}
