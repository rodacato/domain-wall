import { buildPackIndex, type PackIndex } from "../PackIndex";
import { applyPatch } from "./applyPatch";

/** The pack after the business change of its evolution scenario, or undefined if the change cannot be applied. */
export function evolveIndex(index: PackIndex): PackIndex | undefined {
  const evolved = applyPatch(index.pack, index.pack.changeScenarios.evolution.patch);
  return evolved.ok ? buildPackIndex(evolved.value) : undefined;
}
