import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadPackLibrary, packFor, packIdOf } from "./packLibrary";

function filesOf(directory: string): Record<string, unknown> {
  return Object.fromEntries(
    readdirSync(directory)
      .filter((name) => name.endsWith(".json"))
      .map((name) => [
        `../packs/${directory.replace(/^packs\//, "")}/${name}`,
        JSON.parse(readFileSync(join(directory, name), "utf8")),
      ]),
  );
}

const files: Record<string, unknown> = {
  ...filesOf("packs/hecho-a-mano"),
  ...filesOf("packs/presets/clinic"),
  ...filesOf("packs/presets/fintech"),
};
const library = (() => {
  const loaded = loadPackLibrary(files);
  if (!loaded.ok) throw new Error("the bundled packs do not validate");
  return loaded.value;
})();

describe("loadPackLibrary", () => {
  it("separates the default pack from the presets", () => {
    expect(library.defaultPack.meta.packId).toBe("hecho-a-mano");
    expect(library.presets.map((preset) => preset.packId).sort()).toEqual(["clinic", "fintech"]);
  });

  it("fails when the default pack is missing", () => {
    expect(loadPackLibrary({}).ok).toBe(false);
  });
});

describe("packFor", () => {
  it("returns the selected preset, and the default for anything it cannot find", () => {
    expect(packFor(library, { kind: "preset", packId: "clinic" }).meta.packId).toBe("clinic");
    expect(packFor(library, { kind: "preset", packId: "gone" }).meta.packId).toBe("hecho-a-mano");
    expect(packFor(library, { kind: "default" }).meta.packId).toBe("hecho-a-mano");
  });

  it("names the selection for the progress history", () => {
    expect(packIdOf({ kind: "default" })).toBe("default");
    expect(packIdOf({ kind: "preset", packId: "clinic" })).toBe("clinic");
  });
});

describe("generated packs in the library", () => {
  it("finds a generated pack by its key and falls back to the default for one that is gone", async () => {
    const { withGeneratedPack } = await import("./packLibrary");
    const clinicPack = library.presets.find((preset) => preset.packId === "clinic")?.pack;
    if (clinicPack === undefined) throw new Error("the clinic preset must exist");
    const withPack = withGeneratedPack(library, { key: "abc", description: "d", pack: clinicPack });

    expect(packFor(withPack, { kind: "generated", packKey: "abc" }).meta.packId).toBe("clinic");
    expect(packFor(withPack, { kind: "generated", packKey: "gone" }).meta.packId).toBe(
      "hecho-a-mano",
    );
  });

  it("loads stored packs and drops the ones that no longer pass the checks", async () => {
    const { loadGeneratedPacks } = await import("./packLibrary");
    const { InMemoryPackRepository } = await import("../adapters/storage/InMemoryPackRepository");
    const repository = new InMemoryPackRepository();
    await repository.save({
      key: "good",
      createdAt: "x",
      description: "d",
      pack: loadDefaultPackJson(),
    });
    await repository.save({
      key: "bad",
      createdAt: "x",
      description: "d",
      pack: { nonsense: true },
    });

    const loaded = await loadGeneratedPacks(repository);

    expect(loaded.map((entry) => entry.key)).toEqual(["good"]);
  });
});

function loadDefaultPackJson(): unknown {
  return JSON.parse(JSON.stringify(library.defaultPack));
}
