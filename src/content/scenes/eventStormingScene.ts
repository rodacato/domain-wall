import type { ConceptId, ModuleId } from "../../domain/course/ConceptId";
import type { PackIndex } from "../../domain/pack/PackIndex";
import { listAllNotes, notesOfKind, type NoteId, type NoteKind } from "../../domain/wall/Note";
import { cameraTourOfLayer } from "../../domain/wall/cameraTour";
import type { Scene, SceneStep } from "../../domain/wall/Scene";

const MODULE: ModuleId = "event-storming" as ModuleId;

const conceptId = (id: string): ConceptId => id as ConceptId;

function layerStep(
  index: PackIndex,
  id: string,
  concept: string,
  layer: NoteKind,
  extra: SceneStep["commands"] = [],
  dialogue: SceneStep["dialogue"] = null,
): SceneStep {
  return {
    id,
    concept: conceptId(concept),
    dialogue,
    commands: [
      { kind: "placeNotes", ids: notesOfKind(index, layer) },
      ...extra,
      { kind: "focusCamera", target: cameraTourOfLayer(index, layer) },
    ],
  };
}

/** Arrows from each command to the events its transitions emit. */
function commandToEventArrows(index: PackIndex): { from: NoteId; to: NoteId }[] {
  const notes = listAllNotes(index);
  const idOf = (kind: NoteKind, codeName: string): NoteId | undefined =>
    notes.find((note) => note.kind === kind && note.codeName === codeName)?.id;
  return index.pack.aggregates.flatMap((aggregate) =>
    aggregate.transitions.flatMap((transition) => {
      const from = idOf("command", transition.command);
      return transition.emits.flatMap((eventName) => {
        const to = idOf("event", eventName);
        return from === undefined || to === undefined ? [] : [{ from, to }];
      });
    }),
  );
}

/** Arrows from the event a policy listens to, to the policy itself. */
function eventToPolicyArrows(index: PackIndex): { from: NoteId; to: NoteId }[] {
  const notes = listAllNotes(index);
  return index.pack.policies.flatMap((policy) => {
    const from = notes.find((note) => note.kind === "event" && note.codeName === policy.when)?.id;
    const to = notes.find(
      (note) => note.kind === "policy" && note.codeName === policy.codeName,
    )?.id;
    return from === undefined || to === undefined ? [] : [{ from, to }];
  });
}

/**
 * Module 3: the wall fills up layer by layer, following the Event Storming colour convention:
 * events, commands, actors, policies, external systems, read models and aggregates.
 */
export function buildEventStormingScene(index: PackIndex): Scene {
  return {
    id: "event-storming",
    module: MODULE,
    prelude: [],
    steps: [
      {
        id: "kickoff",
        concept: null,
        dialogue: "storming.kickoff",
        commands: [
          { kind: "clearWall" },
          { kind: "setLayout", layout: "timeline" },
          { kind: "focusCamera", target: { kind: "overview" } },
        ],
      },
      layerStep(index, "events", "storm.events", "event"),
      layerStep(
        index,
        "commands",
        "storm.commands",
        "command",
        [{ kind: "drawArrows", arrows: commandToEventArrows(index) }],
        "storming.commands",
      ),
      layerStep(index, "actors", "storm.actors", "actor"),
      layerStep(index, "policies", "storm.policies", "policy", [
        { kind: "drawArrows", arrows: eventToPolicyArrows(index) },
      ]),
      layerStep(index, "external-systems", "storm.external-systems", "externalSystem"),
      layerStep(index, "read-models", "storm.read-models", "readModel"),
      layerStep(index, "aggregates", "storm.aggregates", "aggregate", [{ kind: "eraseArrows" }]),
      {
        id: "big-picture",
        concept: null,
        dialogue: null,
        commands: [
          { kind: "clearEmphasis" },
          { kind: "focusCamera", target: { kind: "overview" } },
        ],
      },
    ],
  };
}

/** The wall as module 3 leaves it: every note of the pack placed on the timeline. */
export function everyNoteOnTheTimeline(index: PackIndex): Scene["prelude"] {
  return [
    { kind: "clearWall" },
    { kind: "setLayout", layout: "timeline" },
    { kind: "placeNotes", ids: listAllNotes(index).map((note) => note.id) },
    { kind: "focusCamera", target: { kind: "overview" } },
  ];
}
