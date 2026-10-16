import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const PACKS_ROOT = "packs";
const PRESETS_DIRECTORY = "presets";

function subdirectories(root: string): string[] {
  return readdirSync(root)
    .map((name) => join(root, name))
    .filter((path) => statSync(path).isDirectory());
}

/** Every pack directory: the default pack and each preset. */
export function packDirectories(): string[] {
  return subdirectories(PACKS_ROOT).flatMap((path) =>
    path.endsWith(PRESETS_DIRECTORY) ? subdirectories(path) : [path],
  );
}
