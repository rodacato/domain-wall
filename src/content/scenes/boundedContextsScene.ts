import type { ConceptId, ModuleId } from "../../domain/course/ConceptId";
import type { PackIndex } from "../../domain/pack/PackIndex";
import type { Scene, SceneStep } from "../../domain/wall/Scene";
import { everyNoteOnTheTimeline } from "./eventStormingScene";

const MODULE: ModuleId = "bounded-contexts" as ModuleId;
const conceptId = (id: string): ConceptId => id as ConceptId;

/**
 * Module 4: the notes regroup by context, a hand-drawn boundary closes each group, and the
 * ambiguous term changes shape as it crosses from one boundary to the next.
 */
export function buildBoundedContextsScene(index: PackIndex): Scene {
  const { contexts, ambiguousTerm } = index.pack;

  const boundarySteps: SceneStep[] = contexts.map((context) => ({
    id: `boundary-${context.codeName}`,
    concept: conceptId("context.bounded-context"),
    dialogue: null,
    commands: [
      { kind: "drawBoundary", context: context.codeName },
      { kind: "focusCamera", target: { kind: "context", context: context.codeName } },
    ],
  }));

  const crossingSteps: SceneStep[] = ambiguousTerm.meanings.map((meaning) => ({
    id: `term-in-${meaning.context}`,
    concept: conceptId("context.term-translation"),
    dialogue: null,
    commands: [
      { kind: "showTerm", context: meaning.context },
      { kind: "focusCamera", target: { kind: "context", context: meaning.context } },
    ],
  }));

  return {
    id: "bounded-contexts",
    module: MODULE,
    prelude: everyNoteOnTheTimeline(index),
    steps: [
      {
        id: "the-wall-so-far",
        concept: null,
        dialogue: null,
        commands: [{ kind: "focusCamera", target: { kind: "overview" } }],
      },
      {
        id: "the-word",
        concept: conceptId("context.bounded-context"),
        dialogue: "ubiquity.ambiguity",
        commands: [{ kind: "showTerm", context: null }],
      },
      {
        id: "regroup",
        concept: conceptId("context.bounded-context"),
        dialogue: "contexts.split",
        commands: [
          { kind: "setLayout", layout: "byContext" },
          { kind: "focusCamera", target: { kind: "overview" } },
        ],
      },
      ...boundarySteps,
      ...crossingSteps,
      {
        id: "overview",
        concept: null,
        dialogue: null,
        commands: [{ kind: "hideTerm" }, { kind: "focusCamera", target: { kind: "overview" } }],
      },
    ],
  };
}
