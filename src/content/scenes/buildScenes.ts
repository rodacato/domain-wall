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

/** The scenes built so far, in syllabus order. */
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
    buildArchitectureScene(),
    buildEvolutionScene(index),
  ];
}
