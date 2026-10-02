import type { LocaleCode } from "../locale/LocaleRegistry";
import { labelOfConcept } from "./conceptLabels";
import type { PackIndex } from "./PackIndex";
import type { LocalizedText } from "../locale/LocalizedText";

export type DialogueSegment =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "term"; readonly codeName: string; readonly text: string };

const TERM_TOKEN = /\{\{term:([A-Za-z0-9]+)\}\}/g;

/**
 * Splits a dialogue line into plain text and term references. A term reference shows the label of
 * the concept in the requested locale; the UI highlights it and feeds the living glossary.
 */
export function dialogueSegments(
  index: PackIndex,
  line: LocalizedText,
  locale: LocaleCode,
): readonly DialogueSegment[] {
  const text = line[locale];
  const segments: DialogueSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(TERM_TOKEN)) {
    const start = match.index;
    if (start > cursor) segments.push({ kind: "text", text: text.slice(cursor, start) });
    const codeName = match[1] ?? "";
    const label = labelOfConcept(index, codeName);
    segments.push({ kind: "term", codeName, text: label === undefined ? codeName : label[locale] });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) segments.push({ kind: "text", text: text.slice(cursor) });
  return segments;
}
