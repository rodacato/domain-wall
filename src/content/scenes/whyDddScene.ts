import { ANEMIC_PLACES } from "../../domain/wall/changeImpact";
import type { Scene } from "../../domain/wall/Scene";
import { conceptId, moduleId } from "./sceneIds";

const WHOLE_CHANGE = { kind: "changeStory", scenario: "businessChange" } as const;

/** Module 1: the same business change lands in many places of an anemic model and in one place of a rich one. */
export function buildWhyDddScene(): Scene {
  const afterHalf = Math.ceil(ANEMIC_PLACES.length / 2);
  return {
    id: "why-ddd",
    module: moduleId("why-ddd"),
    prelude: [{ kind: "clearWall" }],
    steps: [
      {
        id: "the-change",
        concept: conceptId("why.cost-of-change"),
        dialogue: "whyDdd.change",
        focus: WHOLE_CHANGE,
        commands: [{ kind: "showImpact", model: "anemic", revealed: 0 }],
      },
      {
        id: "the-rule-is-copied",
        concept: conceptId("why.anemic-model"),
        dialogue: null,
        focus: WHOLE_CHANGE,
        commands: [{ kind: "showImpact", model: "anemic", revealed: afterHalf }],
      },
      {
        id: "everywhere",
        concept: conceptId("why.ball-of-mud"),
        dialogue: null,
        focus: WHOLE_CHANGE,
        commands: [{ kind: "showImpact", model: "anemic", revealed: ANEMIC_PLACES.length }],
      },
      {
        id: "one-place",
        concept: conceptId("why.model-driven"),
        dialogue: null,
        focus: WHOLE_CHANGE,
        commands: [{ kind: "showImpact", model: "rich", revealed: 1 }],
      },
    ],
  };
}
