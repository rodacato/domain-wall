import { describe, expect, it } from "vitest";
import { loadPackDirectory } from "../../../scripts/lib/loadPackDirectory";
import { packDirectories } from "../../../scripts/lib/packDirectories";
import { buildPackIndex } from "../../domain/pack/PackIndex";
import { loadDefaultPack } from "../../domain/pack/packFixtures";
import { wallAfterStep } from "../../domain/wall/Scene";
import { buildTacticalScene } from "./tacticalScene";
import { tacticalFocus } from "./tacticalFocus";

describe("the tactical scene", () => {
  const index = buildPackIndex(loadDefaultPack());

  it("follows the aggregate that handles the workflow trigger", () => {
    const focus = tacticalFocus(index);

    expect(focus?.aggregate.codeName).toBe("Order");
    expect(focus?.valueObject).toBe("Quantity");
    expect(focus?.entityHost?.entity).toBe("OrderLine");
    expect(focus?.rule).toEqual({ name: "OrderLinesWithinLimit", kind: "invariant" });
  });

  it("zooms in on code first and comes back to the wall for the services", () => {
    const scene = buildTacticalScene(index);
    const levels = scene.steps.map((_step, position) => wallAfterStep(scene, position).code.level);

    expect(levels).toEqual([
      "code",
      "code",
      "aggregate",
      "code",
      "code",
      "code",
      "code",
      "code",
      "hidden",
      "hidden",
    ]);
  });

  it("lets the learner attack the aggregate only in the invariant step", () => {
    const scene = buildTacticalScene(index);
    const attackable = scene.steps.filter((step) =>
      step.commands.some(
        (command) => command.kind === "showCode" && command.mode === "breakInvariants",
      ),
    );

    expect(attackable.map((step) => step.id)).toEqual(["invariant"]);
  });

  it.each(packDirectories().map((directory) => [directory] as const))(
    "can be built for %s",
    (directory) => {
      const loaded = loadPackDirectory(directory);
      if (!loaded.ok) throw new Error(`${directory} does not parse`);

      expect(() => buildTacticalScene(buildPackIndex(loaded.value))).not.toThrow();
    },
  );
});
