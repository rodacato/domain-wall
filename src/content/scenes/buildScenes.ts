import type { ExerciseKind } from "../../domain/course/Syllabus";
import type { PackIndex } from "../../domain/pack/PackIndex";
import type { Scene } from "../../domain/wall/Scene";
import { buildArchitectureScene } from "./architectureScene";
import { buildBoundedContextsScene } from "./boundedContextsScene";
import { buildContextMapScene } from "./contextMapScene";
import { buildEventStormingScene } from "./eventStormingScene";
import { buildEvolutionScene } from "./evolutionScene";
import { buildFunctionalScene } from "./functionalScene";
import { buildSubdomainsScene } from "./subdomainsScene";
import { buildTacticalScene } from "./tacticalScene";
import { buildUbiquitousLanguageScene } from "./ubiquitousLanguageScene";
import { buildWhyDddScene } from "./whyDddScene";

/** The exercise each module ends with, as the syllabus declares it. */
export const EXERCISE_OF_MODULE: Readonly<Record<string, ExerciseKind>> = {
  "why-ddd": "locateTheRule",
  "ubiquitous-language": "classifyPhrases",
  "event-storming": "orderEvents",
  "bounded-contexts": "assignNotesToContexts",
  "context-map": "implementAntiCorruptionLayer",
  subdomains: "classifySubdomains",
  "tactical-building-blocks": "implementTheRule",
  "functional-modeling": "addPipelineStage",
  architecture: "implementRepositoryAdapter",
  evolution: "implementTheChange",
};

function endingWithExercise(scene: Scene): Scene {
  const exercise = EXERCISE_OF_MODULE[scene.module];
  if (exercise === undefined) return scene;
  return {
    ...scene,
    steps: [
      ...scene.steps,
      {
        id: "exercise",
        concept: null,
        dialogue: null,
        commands: [{ kind: "showExercise", exercise }],
      },
    ],
  };
}

/** The scenes of the course, in syllabus order, each ending with its exercise. */
export function buildScenes(index: PackIndex): readonly Scene[] {
  return [
    buildWhyDddScene(),
    buildUbiquitousLanguageScene(index),
    buildEventStormingScene(index),
    buildBoundedContextsScene(index),
    buildContextMapScene(index),
    buildSubdomainsScene(index),
    buildTacticalScene(index),
    buildFunctionalScene(index),
    buildArchitectureScene(index),
    buildEvolutionScene(index),
  ].map(endingWithExercise);
}
