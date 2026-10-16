import { describe, expect, it } from "vitest";
import type { ModuleId } from "../course/ConceptId";
import type { Scene } from "./Scene";
import { nextDemoPosition } from "./demoTour";

const scene = (id: string, steps: number, exercise: boolean): Scene => ({
  id,
  module: id as ModuleId,
  prelude: [],
  steps: [
    ...Array.from({ length: steps }, (_, position) => ({
      id: `${id}-${position}`,
      concept: null,
      dialogue: null,
      commands: [],
    })),
    ...(exercise
      ? [
          {
            id: `${id}-exercise`,
            concept: null,
            dialogue: null,
            commands: [{ kind: "showExercise" as const, exercise: "orderEvents" as const }],
          },
        ]
      : []),
  ],
});

const scenes = [scene("a", 2, true), scene("b", 1, false)];

describe("the demo tour", () => {
  it("moves to the next step of the scene", () => {
    expect(nextDemoPosition(scenes, { sceneId: "a", stepIndex: 0 })).toEqual({
      sceneId: "a",
      stepIndex: 1,
    });
  });

  it("skips the exercise at the end of a module and goes to the next scene", () => {
    expect(nextDemoPosition(scenes, { sceneId: "a", stepIndex: 1 })).toEqual({
      sceneId: "b",
      stepIndex: 0,
    });
  });

  it("ends after the last step of the last scene", () => {
    expect(nextDemoPosition(scenes, { sceneId: "b", stepIndex: 0 })).toBeNull();
  });

  it("knows nothing of a scene that does not exist", () => {
    expect(nextDemoPosition(scenes, { sceneId: "z", stepIndex: 0 })).toBeNull();
  });
});
