import { CURRENT_SCHEMA_VERSION } from "../pack/schema/DomainPack";

/** A short, stable hash of a text (FNV-1a), good enough to name a cached pack. */
function hash(text: string): string {
  let value = 2166136261;
  for (const character of text) {
    value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  }
  return (value >>> 0).toString(16).padStart(8, "0");
}

/** Same description, locales, model and schema version give the same key, so a pack is generated once. */
export function packCacheKey(input: {
  readonly description: string;
  readonly locales: readonly string[];
  readonly model: string;
}): string {
  const normalized = input.description.trim().replace(/\s+/g, " ").toLowerCase();
  return hash(
    JSON.stringify([normalized, [...input.locales].sort(), input.model, CURRENT_SCHEMA_VERSION]),
  );
}
