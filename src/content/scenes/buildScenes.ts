import type { PackIndex } from "../../domain/pack/PackIndex";
import type { Scene } from "../../domain/wall/Scene";
import { buildBoundedContextsScene } from "./boundedContextsScene";
import { buildContextMapScene } from "./contextMapScene";
import { buildEventStormingScene } from "./eventStormingScene";
import { buildSubdomainsScene } from "./subdomainsScene";
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
  ];
}
