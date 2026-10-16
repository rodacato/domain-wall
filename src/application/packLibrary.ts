import { assemblePackParts } from "../domain/pack/assemblePackParts";
import { parseDomainPack } from "../domain/pack/parseDomainPack";
import {
  validateSemantics,
  type SemanticallyValidPack,
} from "../domain/pack/validation/validateSemantics";
import type { PackSelection } from "../domain/progress/LearnerPreferences";
import { ok, type Result } from "../domain/shared/Result";
import type { PackRepository } from "../ports/PackRepository";
import type { ValidationIssue } from "../domain/shared/ValidationIssue";

export interface PresetPack {
  readonly packId: string;
  readonly pack: SemanticallyValidPack;
}

/** Every pack bundled with the app: the one the course was written around and the curated industries. */
export interface PackLibrary {
  readonly defaultPack: SemanticallyValidPack;
  readonly presets: readonly PresetPack[];
  /** Packs generated for this learner, by the key of the request that produced them. */
  readonly generated: readonly GeneratedPack[];
}

export interface GeneratedPack {
  readonly key: string;
  readonly description: string;
  readonly pack: SemanticallyValidPack;
}

const DEFAULT_PATH = /\/packs\/([^/]+)\/[^/]+\.json$/;
const PRESET_PATH = /\/packs\/presets\/([^/]+)\/([^/]+\.json)$/;

function validated(
  parts: Record<string, unknown>,
): Result<SemanticallyValidPack, readonly ValidationIssue[]> {
  const assembled = assemblePackParts(parts);
  if (!assembled.ok) return assembled;
  const parsed = parseDomainPack(assembled.value);
  return parsed.ok ? validateSemantics(parsed.value) : parsed;
}

/** Builds the library from pack files named `.../packs/<pack>/<part>.json` and `.../packs/presets/<id>/<part>.json`. */
export function loadPackLibrary(
  filesByPath: Readonly<Record<string, unknown>>,
): Result<PackLibrary, readonly ValidationIssue[]> {
  const defaults: Record<string, unknown> = {};
  const presets = new Map<string, Record<string, unknown>>();
  for (const [path, content] of Object.entries(filesByPath)) {
    const preset = PRESET_PATH.exec(path);
    if (preset?.[1] !== undefined && preset[2] !== undefined) {
      presets.set(preset[1], { ...presets.get(preset[1]), [preset[2]]: content });
      continue;
    }
    const direct = DEFAULT_PATH.exec(path);
    const fileName = path.slice(path.lastIndexOf("/") + 1);
    if (direct !== null) defaults[fileName] = content;
  }

  const defaultPack = validated(defaults);
  if (!defaultPack.ok) return defaultPack;
  const validPresets = [...presets.entries()].flatMap(([packId, parts]) => {
    const pack = validated(parts);
    return pack.ok ? [{ packId, pack: pack.value }] : [];
  });
  return ok({ defaultPack: defaultPack.value, presets: validPresets, generated: [] });
}

/** The pack a learner's selection points at; a selection that no longer exists falls back to the default. */
export function packFor(library: PackLibrary, selection: PackSelection): SemanticallyValidPack {
  if (selection.kind === "generated") {
    return (
      library.generated.find((entry) => entry.key === selection.packKey)?.pack ??
      library.defaultPack
    );
  }
  if (selection.kind === "preset") {
    return (
      library.presets.find((preset) => preset.packId === selection.packId)?.pack ??
      library.defaultPack
    );
  }
  return library.defaultPack;
}

export function packIdOf(selection: PackSelection): string {
  switch (selection.kind) {
    case "default":
      return "default";
    case "preset":
      return selection.packId;
    case "generated":
      return selection.packKey;
  }
}

export function withGeneratedPack(library: PackLibrary, entry: GeneratedPack): PackLibrary {
  return {
    ...library,
    generated: [...library.generated.filter((known) => known.key !== entry.key), entry],
  };
}

/** Generated packs that were stored earlier, checked again before they are trusted; any that no longer pass are dropped. */
export async function loadGeneratedPacks(
  repository: PackRepository,
): Promise<readonly GeneratedPack[]> {
  const stored = await repository.list();
  if (!stored.ok) return [];
  return stored.value.flatMap((entry) => {
    const parsed = parseDomainPack(entry.pack);
    const checked = parsed.ok ? validateSemantics(parsed.value) : undefined;
    return checked?.ok === true
      ? [{ key: entry.key, description: entry.description, pack: checked.value }]
      : [];
  });
}
