import type { LookAtNote, NarrationFocus, Scene, SceneStep } from "../../domain/wall/Scene";
import { conceptId, moduleId } from "./sceneIds";

function lookAt(note: LookAtNote): NarrationFocus {
  return { kind: "lookAt", note, subject: null };
}

/** Module 9: from layers that depend downwards to a domain at the centre that depends on nothing. */
export function buildArchitectureScene(): Scene {
  const steps: SceneStep[] = [
    {
      id: "layers",
      concept: conceptId("architecture.layers"),
      dialogue: null,
      focus: lookAt("layers"),
      commands: [{ kind: "showArchitecture", view: "layers" }],
    },
    {
      id: "hexagon",
      concept: conceptId("architecture.hexagonal"),
      dialogue: "architecture.ports",
      focus: lookAt("hexagonal"),
      commands: [{ kind: "showArchitecture", view: "hexagon" }],
    },
    {
      id: "swap-adapters",
      concept: conceptId("architecture.ports-adapters"),
      dialogue: null,
      focus: lookAt("portsAdapters"),
      commands: [{ kind: "showArchitecture", view: "swap" }],
    },
    {
      id: "dependency-rule",
      concept: conceptId("architecture.dependency-rule"),
      dialogue: null,
      focus: lookAt("dependencyRule"),
      commands: [{ kind: "showArchitecture", view: "rule" }],
    },
  ];
  return {
    id: "architecture",
    module: moduleId("architecture"),
    prelude: [{ kind: "clearWall" }],
    steps,
  };
}
