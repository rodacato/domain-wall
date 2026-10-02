import { loadPackDirectory } from "../../../scripts/lib/loadPackDirectory";
import type { SchemaValidPack } from "./parseDomainPack";
import type { DomainPack } from "./schema/DomainPack";

const DEFAULT_PACK_DIRECTORY = "packs/hecho-a-mano";

/** Loads the curated default pack for tests. Throws, because a broken fixture is a broken test. */
export function loadDefaultPack(): SchemaValidPack {
  const loaded = loadPackDirectory(DEFAULT_PACK_DIRECTORY);
  if (!loaded.ok) {
    const details = loaded.error.map((issue) => `${issue.path}: ${issue.message}`).join("\n");
    throw new Error(`the default pack does not parse:\n${details}`);
  }
  return loaded.value;
}

/** A deep copy that a test can mutate to break one thing at a time. */
export function mutablePack(): DomainPack {
  return structuredClone(loadDefaultPack());
}

export function required<Value>(value: Value | undefined, description: string): Value {
  if (value === undefined) throw new Error(`fixture is missing ${description}`);
  return value;
}
