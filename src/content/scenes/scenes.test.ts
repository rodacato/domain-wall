import { describe, expect, it } from "vitest";
import { buildPackIndex } from "../../domain/pack/PackIndex";
import { loadDefaultPack } from "../../domain/pack/packFixtures";
import { listAllNotes } from "../../domain/wall/Note";
import { wallAfterStep, wallBeforeScene, type Scene } from "../../domain/wall/Scene";
import { buildScenes } from "./buildScenes";

const index = buildPackIndex(loadDefaultPack());
const scenes = buildScenes(index);
const sceneNamed = (id: string): Scene => {
  const found = scenes.find((scene) => scene.id === id);
  if (found === undefined) throw new Error(`no scene ${id}`);
  return found;
};
const lastStep = (scene: Scene): number => scene.steps.length - 1;
const dialogueSlots = new Set(Object.keys(index.pack.dialogues));

describe("every scene", () => {
  it.each(scenes.map((scene) => [scene.id, scene] as const))(
    "%s uses only known dialogue slots and unique step ids",
    (_id, scene) => {
      const stepIds = scene.steps.map((step) => step.id);

      expect(new Set(stepIds).size).toBe(stepIds.length);
      for (const step of scene.steps) {
        if (step.dialogue !== null) expect(dialogueSlots.has(step.dialogue)).toBe(true);
      }
    },
  );

  it.each(scenes.map((scene) => [scene.id, scene] as const))(
    "%s only places notes the pack can show",
    (_id, scene) => {
      const known = new Set<string>(listAllNotes(index).map((note) => note.id));
      const placed = scene.steps.flatMap((step) =>
        step.commands.flatMap((command) => (command.kind === "placeNotes" ? command.ids : [])),
      );

      expect(placed.filter((id) => !known.has(id))).toEqual([]);
    },
  );
});

describe("the Event Storming scene", () => {
  const scene = sceneNamed("event-storming");

  it("starts with an empty wall", () => {
    expect(wallBeforeScene(scene).notes).toEqual([]);
  });

  it("places the layers in the order of the convention", () => {
    const order: string[] = [];
    for (const [position] of scene.steps.entries()) {
      for (const note of wallAfterStep(scene, position).notes) {
        const kind = note.id.split(":")[0] ?? "";
        if (!order.includes(kind)) order.push(kind);
      }
    }

    expect(order).toEqual([
      "event",
      "command",
      "actor",
      "policy",
      "externalSystem",
      "readModel",
      "aggregate",
    ]);
  });

  it("ends with every note of the pack on the wall", () => {
    expect(wallAfterStep(scene, lastStep(scene)).notes).toHaveLength(listAllNotes(index).length);
  });

  it("draws an arrow from each command to its event", () => {
    const afterCommands = wallAfterStep(scene, 2);

    expect(afterCommands.arrows).toContainEqual({
      from: "command:PlaceOrder",
      to: "event:OrderPlaced",
    });
  });
});

describe("the bounded contexts scene", () => {
  const scene = sceneNamed("bounded-contexts");

  it("starts from the full timeline", () => {
    const start = wallBeforeScene(scene);

    expect(start.layout).toBe("timeline");
    expect(start.notes).toHaveLength(listAllNotes(index).length);
  });

  it("regroups by context and then draws every boundary", () => {
    const end = wallAfterStep(scene, lastStep(scene));

    expect(end.layout).toBe("byContext");
    expect([...end.boundaries].sort()).toEqual(
      index.pack.contexts.map((context) => context.codeName).sort(),
    );
  });

  it("walks the term through every context where it has a meaning", () => {
    const contexts = scene.steps
      .flatMap((step) => step.commands)
      .flatMap((command) =>
        command.kind === "showTerm" && command.context !== null ? [command.context] : [],
      );

    expect(contexts).toEqual(index.pack.ambiguousTerm.meanings.map((meaning) => meaning.context));
  });

  it("hides the term again at the end", () => {
    expect(wallAfterStep(scene, lastStep(scene)).term.shown).toBe(false);
  });
});
