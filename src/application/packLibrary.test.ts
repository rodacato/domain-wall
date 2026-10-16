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
