import { describe, expect, it } from "vitest";
import { loadPackDirectory } from "../../../scripts/lib/loadPackDirectory";
import { packDirectories } from "../../../scripts/lib/packDirectories";
import { buildPackIndex } from "../../domain/pack/PackIndex";
import { loadDefaultPack } from "../../domain/pack/packFixtures";
import { wallAfterStep } from "../../domain/wall/Scene";
import { buildEvolutionScene } from "./evolutionScene";

describe("the evolution scene", () => {
  const scene = buildEvolutionScene(buildPackIndex(loadDefaultPack()));

  it("shows the model in version 1, then grows it to version 2 and ends on the whole wall", () => {
    const versions = scene.steps.map((_step, position) => wallAfterStep(scene, position).version);

    expect(versions).toEqual([1, 2, 2, 2]);
    expect(wallAfterStep(scene, 3).code.level).toBe("hidden");
  });

  it("highlights exactly the notes the change adds", () => {
    const grown = wallAfterStep(scene, 1);
    const highlighted = grown.notes.filter((note) => note.emphasis === "highlighted");

    expect(highlighted.length).toBeGreaterThan(0);
    expect(grown.notes.length).toBeGreaterThan(highlighted.length);
  });

  it("shows the code change of the aggregate the business change reshapes", () => {
    const code = wallAfterStep(scene, 2).code;

    expect(code.mode).toBe("diff");
    expect(code.unit).toEqual({ kind: "aggregate", aggregate: "Order" });
  });

  it.each(packDirectories().map((directory) => [directory] as const))(
    "can be built for %s",
    (directory) => {
      const loaded = loadPackDirectory(directory);
      if (!loaded.ok) throw new Error(`${directory} does not parse`);

      expect(() => buildEvolutionScene(buildPackIndex(loaded.value))).not.toThrow();
    },
  );
});
