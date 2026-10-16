import type { PackIndex } from "../../domain/pack/PackIndex";
import { noteIdOf, notesOfKind } from "../../domain/wall/Note";
import type { LookAtNote, NarrationFocus, Scene, SceneStep } from "../../domain/wall/Scene";
import { conceptId, moduleId } from "./sceneIds";
import { tacticalFocus } from "./tacticalFocus";

function lookAt(note: LookAtNote, subject: string | null): NarrationFocus {
  return { kind: "lookAt", note, subject };
}

/** Module 7: the wall opens up and the notes turn into the code that implements them. */
export function buildTacticalScene(index: PackIndex): Scene {
  const focus = tacticalFocus(index);
  if (focus === undefined) throw new Error("the pack has nothing for the tactical module to show");

  const hero = { kind: "aggregate", aggregate: focus.aggregate.codeName } as const;
  const ruleRef = `${focus.aggregate.codeName}.${focus.rule.kind}.${focus.rule.name}`;
  const entityUnit =
    focus.entityHost === null
      ? hero
      : ({ kind: "aggregate", aggregate: focus.entityHost.aggregate.codeName } as const);
  const heroNotes = {
    command: noteIdOf("command", focus.command),
    aggregate: noteIdOf("aggregate", focus.aggregate.codeName),
    event: noteIdOf("event", focus.event),
  };

  const steps: SceneStep[] = [
    {
      id: "value-object",
      concept: conceptId("tactical.value-object"),
      dialogue: null,
      focus: {
        kind: "lookAt",
        note: "valueObject",
        subject: focus.valueObject === null ? null : `valueObject.${focus.valueObject}`,
      },
      commands: [
        {
          kind: "showCode",
          level: "code",
          unit: { kind: "valueObjects" },
          ...(focus.valueObject === null ? {} : { focus: `valueObject.${focus.valueObject}` }),
        },
      ],
    },
    {
      id: "entity",
      concept: conceptId("tactical.entity"),
      dialogue: null,
      focus: {
        kind: "lookAt",
        note: "entity",
        subject:
          focus.entityHost === null
            ? null
            : `${focus.entityHost.aggregate.codeName}.entity.${focus.entityHost.entity}`,
      },
      commands: [
        {
          kind: "showCode",
          level: "code",
          unit: entityUnit,
          ...(focus.entityHost === null
            ? {}
            : {
                focus: `${focus.entityHost.aggregate.codeName}.entity.${focus.entityHost.entity}`,
              }),
        },
      ],
    },
    {
      id: "aggregate-opened",
      concept: conceptId("tactical.aggregate"),
      dialogue: "tactical.aggregate",
      focus: lookAt("aggregateOutline", focus.aggregate.codeName),
      commands: [{ kind: "showCode", level: "aggregate", unit: hero }],
    },
    {
      id: "aggregate-code",
      concept: conceptId("tactical.aggregate"),
      dialogue: null,
      focus: lookAt("aggregateCode", focus.aggregate.codeName),
      commands: [{ kind: "showCode", level: "code", unit: hero, focus: focus.aggregate.codeName }],
    },
    {
      id: "invariant",
      concept: conceptId("tactical.invariant"),
      dialogue: null,
      focus: lookAt("invariant", ruleRef),
      commands: [
        { kind: "showCode", level: "code", unit: hero, focus: ruleRef, mode: "breakInvariants" },
      ],
    },
    {
      id: "domain-event",
      concept: conceptId("tactical.domain-event"),
      dialogue: null,
      focus: lookAt("event", `event.${focus.event}`),
      commands: [
        {
          kind: "showCode",
          level: "code",
          unit: { kind: "events" },
          focus: `event.${focus.event}`,
        },
      ],
    },
    {
      id: "repository",
      concept: conceptId("tactical.repository"),
      dialogue: null,
      focus: lookAt("repository", `${focus.aggregate.codeName}.repository`),
      commands: [
        {
          kind: "showCode",
          level: "code",
          unit: hero,
          focus: `${focus.aggregate.codeName}.repository`,
        },
      ],
    },
    {
      id: "factory",
      concept: conceptId("tactical.factory"),
      dialogue: null,
      focus: lookAt("factory", `${focus.aggregate.codeName}.factory`),
      commands: [
        {
          kind: "showCode",
          level: "code",
          unit: hero,
          focus: `${focus.aggregate.codeName}.factory`,
        },
      ],
    },
    {
      id: "domain-service",
      concept: conceptId("tactical.domain-service"),
      dialogue: null,
      focus: lookAt("domainService", null),
      commands: [
        { kind: "hideCode" },
        { kind: "placeNotes", ids: notesOfKind(index, "aggregate") },
        { kind: "emphasize", ids: notesOfKind(index, "aggregate"), emphasis: "highlighted" },
        { kind: "focusCamera", target: { kind: "layer", layer: "aggregate" } },
      ],
    },
    {
      id: "application-service",
      concept: conceptId("tactical.application-service"),
      dialogue: null,
      focus: lookAt("applicationService", null),
      commands: [
        { kind: "clearEmphasis" },
        { kind: "placeNotes", ids: [heroNotes.command, heroNotes.event] },
        {
          kind: "drawArrows",
          arrows: [
            { from: heroNotes.command, to: heroNotes.aggregate },
            { from: heroNotes.aggregate, to: heroNotes.event },
          ],
        },
        {
          kind: "emphasize",
          ids: [heroNotes.command, heroNotes.aggregate, heroNotes.event],
          emphasis: "highlighted",
        },
        {
          kind: "focusCamera",
          target: { kind: "notes", ids: [heroNotes.command, heroNotes.aggregate, heroNotes.event] },
        },
      ],
    },
  ];

  return {
    id: "tactical-building-blocks",
    module: moduleId("tactical-building-blocks"),
    prelude: [{ kind: "clearWall" }, { kind: "setLayout", layout: "timeline" }],
    steps,
  };
}
