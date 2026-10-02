import type { PackIndex } from "../../domain/pack/PackIndex";
import type { Scene } from "../../domain/wall/Scene";
import { buildBoundedContextsScene } from "./boundedContextsScene";
import { buildEventStormingScene } from "./eventStormingScene";

/** Scenes available so far, in syllabus order. More arrive as modules are built. */
export function buildScenes(index: PackIndex): readonly Scene[] {
  return [buildEventStormingScene(index), buildBoundedContextsScene(index)];
}
