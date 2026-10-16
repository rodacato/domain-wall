import type { PackIndex } from "../../domain/pack/PackIndex";
import { evolveIndex } from "../../domain/pack/patch/evolveIndex";
import type { NoteId } from "../../domain/wall/Note";
import { notesIn } from "../../domain/wall/Note";
import type { LookAtNote, NarrationFocus, Scene, SceneStep } from "../../domain/wall/Scene";
import { conceptId, moduleId } from "./sceneIds";

const EVOLUTION_STORY = { kind: "changeStory", scenario: "evolution" } as const;

function lookAt(note: LookAtNote): NarrationFocus {
  return { kind: "lookAt", note, subject: null };
}

/** The aggregate the business change reshapes most, which is the one whose code the diff shows. */
function changedAggregate(index: PackIndex): string | undefined {
  for (const operation of index.pack.changeScenarios.evolution.patch) {
    if ("aggregate" in operation) return operation.aggregate;
  }
  return undefined;
}

/** Module 10: a new requirement reaches the wall, the model grows and the code changes only where the change is. */
export function buildEvolutionScene(index: PackIndex): Scene {
  const evolved = evolveIndex(index);
  const aggregate = changedAggregate(index);
  if (evolved === undefined || aggregate === undefined) {
    throw new Error("the evolution scenario of the pack cannot be applied");
  }
  const before = notesIn(index, "timeline");
  const known = new Set<NoteId>(before.map((note) => note.id));
  const added = notesIn(evolved, "timeline")
    .map((note) => note.id)
    .filter((id) => !known.has(id));

  const steps: SceneStep[] = [
    {
      id: "the-request",
      concept: conceptId("evolution.implicit-concepts"),
      dialogue: "evolution.request",
      focus: EVOLUTION_STORY,
      commands: [
        { kind: "setLayout", layout: "timeline" },
        { kind: "placeNotes", ids: before.map((note) => note.id) },
        { kind: "focusCamera", target: { kind: "overview" } },
      ],
    },
    {
      id: "the-model-grows",
      concept: conceptId("evolution.refactoring-toward-insight"),
      dialogue: null,
      focus: lookAt("newNotes"),
      commands: [
        { kind: "evolveModel" },
        { kind: "placeNotes", ids: added },
        { kind: "emphasize", ids: added, emphasis: "highlighted" },
        { kind: "focusCamera", target: { kind: "notes", ids: added } },
      ],
    },
    {
      id: "the-code-follows",
      concept: conceptId("evolution.refactoring-toward-insight"),
      dialogue: null,
      focus: lookAt("evolutionDiff"),
      commands: [
        {
          kind: "showCode",
          level: "code",
          unit: { kind: "aggregate", aggregate },
          mode: "diff",
        },
      ],
    },
    {
      id: "version-two",
      concept: conceptId("evolution.breakthrough"),
      dialogue: null,
      focus: lookAt("breakthrough"),
      commands: [
        { kind: "hideCode" },
        { kind: "clearEmphasis" },
        { kind: "focusCamera", target: { kind: "overview" } },
      ],
    },
  ];

  return {
    id: "evolution",
    module: moduleId("evolution"),
    prelude: [{ kind: "clearWall" }, { kind: "setLayout", layout: "timeline" }],
    steps,
  };
}
