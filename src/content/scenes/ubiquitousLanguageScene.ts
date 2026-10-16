import type { PackIndex } from "../../domain/pack/PackIndex";
import { TERM_REFERENCE_PATTERN, type DialogueSlot } from "../../domain/pack/schema/Dialogue";
import type { Scene } from "../../domain/wall/Scene";
import { conceptId, moduleId } from "./sceneIds";

function termsMentionedIn(index: PackIndex, slot: DialogueSlot): readonly string[] {
  const mentioned = index.pack.dialogues[slot].flatMap((line) =>
    [...line.text.en.matchAll(TERM_REFERENCE_PATTERN)].map((match) => match[1] ?? ""),
  );
  return [...new Set(mentioned)];
}

/** Module 2: terms from the conversation flow into a living glossary; an ambiguous word is flagged and then split. */
export function buildUbiquitousLanguageScene(index: PackIndex): Scene {
  const { ambiguousTerm, aggregates } = index.pack;
  return {
    id: "ubiquitous-language",
    module: moduleId("ubiquitous-language"),
    prelude: [{ kind: "clearWall" }],
    steps: [
      {
        id: "first-words",
        concept: conceptId("lang.ubiquitous-language"),
        dialogue: "ubiquity.intro",
        commands: [
          { kind: "addGlossaryEntries", concepts: termsMentionedIn(index, "ubiquity.intro") },
        ],
      },
      {
        id: "the-glossary-grows",
        concept: conceptId("lang.glossary"),
        dialogue: null,
        commands: [
          {
            kind: "addGlossaryEntries",
            concepts: aggregates.map((aggregate) => aggregate.codeName),
          },
        ],
      },
      {
        id: "one-word-many-meanings",
        concept: conceptId("lang.ambiguity"),
        dialogue: "ubiquity.ambiguity",
        commands: [{ kind: "flagAmbiguous", concept: ambiguousTerm.codeName }],
      },
      {
        id: "resolved",
        concept: conceptId("lang.ambiguity"),
        dialogue: null,
        commands: [{ kind: "resolveAmbiguity", concept: ambiguousTerm.codeName }],
      },
    ],
  };
}
