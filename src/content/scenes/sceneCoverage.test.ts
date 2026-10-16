import { describe, expect, it } from "vitest";
import { loadSyllabus } from "../../../scripts/lib/loadSyllabus";
import { buildPackIndex } from "../../domain/pack/PackIndex";
import { loadDefaultPack } from "../../domain/pack/packFixtures";
import { wallAfterStep } from "../../domain/wall/Scene";
import { buildScenes } from "./buildScenes";

const syllabus = (() => {
  const loaded = loadSyllabus();
  if (!loaded.ok) throw new Error("the course syllabus does not parse");
  return loaded.value;
})();
const scenes = buildScenes(buildPackIndex(loadDefaultPack()));

describe("scene coverage of the syllabus", () => {
  it.each(scenes.map((scene) => [scene.id, scene] as const))(
    "%s teaches exactly the concepts of its module",
    (_id, scene) => {
      const courseModule = syllabus.modules.find((candidate) => candidate.id === scene.module);
      const taught = new Set(
        scene.steps.flatMap((step) => (step.concept === null ? [] : [step.concept])),
      );

      expect(courseModule).toBeDefined();
      expect([...taught].sort()).toEqual(
        (courseModule?.concepts ?? []).map((concept) => concept.id).sort(),
      );
    },
  );

  it("ends every module with the exercise the syllabus declares", () => {
    for (const scene of scenes) {
      const declared = syllabus.modules.find(
        (candidate) => candidate.id === scene.module,
      )?.exercises;
      const last = scene.steps[scene.steps.length - 1]?.commands[0];

      expect(last?.kind === "showExercise" ? [last.exercise] : []).toEqual(declared);
    }
  });

  it("builds scenes in syllabus order", () => {
    const order = syllabus.modules.map((courseModule) => courseModule.id as string);

    const positions = scenes.map((scene) => order.indexOf(scene.module));

    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it.each(scenes.map((scene) => [scene.id, scene] as const))(
    "%s never draws an arrow between notes that are not on the wall",
    (_id, scene) => {
      for (const [position] of scene.steps.entries()) {
        const wall = wallAfterStep(scene, position);
        const present = new Set<string>(wall.notes.map((note) => note.id));

        for (const arrow of wall.arrows) {
          expect(present.has(arrow.from) && present.has(arrow.to)).toBe(true);
        }
      }
    },
  );
});
