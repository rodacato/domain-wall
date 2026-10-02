import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { assemblePackParts } from "../../src/domain/pack/assemblePackParts";
import { parseDomainPack, type SchemaValidPack } from "../../src/domain/pack/parseDomainPack";
import type { Result } from "../../src/domain/shared/Result";
import type { ValidationIssue } from "../../src/domain/shared/ValidationIssue";

/** Reads a curated pack authored as several JSON files and parses it against the schema. */
export function loadPackDirectory(
  directory: string,
): Result<SchemaValidPack, readonly ValidationIssue[]> {
  const parts: Record<string, unknown> = {};
  for (const fileName of readdirSync(directory).filter((name) => name.endsWith(".json"))) {
    parts[fileName] = JSON.parse(readFileSync(join(directory, fileName), "utf8"));
  }
  const assembled = assemblePackParts(parts);
  if (!assembled.ok) return assembled;
  return parseDomainPack(assembled.value);
}
