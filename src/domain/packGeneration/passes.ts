import type { z } from "zod";
import { domainPackSchema, type DomainPack } from "../pack/schema/DomainPack";

/** The pack is generated in passes, each small enough for one answer and each building on the ones before it. */
export const PASS_IDS = ["storm", "strategy", "model", "narrative"] as const;
export type PassId = (typeof PASS_IDS)[number];

type PackKey = Exclude<keyof DomainPack, "schemaVersion" | "meta">;

interface PassDefinition {
  readonly id: PassId;
  readonly keys: readonly PackKey[];
  readonly schema: z.ZodType;
}

function passOf(id: PassId, keys: readonly PackKey[]): PassDefinition {
  const mask = Object.fromEntries(keys.map((key) => [key, true])) as Record<PackKey, true>;
  return { id, keys, schema: domainPackSchema.pick(mask) };
}

export const PASSES: readonly PassDefinition[] = [
  passOf("storm", [
    "business",
    "experts",
    "actors",
    "events",
    "commands",
    "policies",
    "externalSystems",
    "readModels",
  ]),
  passOf("strategy", ["contexts", "contextRelations", "ambiguousTerm", "antiCorruptionLayer"]),
  passOf("model", ["valueObjects", "aggregates"]),
  passOf("narrative", ["workflow", "dialogues", "changeScenarios"]),
];

export function passDefinition(id: PassId): PassDefinition {
  const found = PASSES.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`unknown pass ${id}`);
  return found;
}

/** What the language model has produced so far. */
export type PackDraft = Partial<Pick<DomainPack, PackKey>>;

/** The pass that owns a part of the pack, which is where an issue about that part has to be fixed. */
export function passOwning(key: string): PassId | undefined {
  return PASSES.find((pass) => (pass.keys as readonly string[]).includes(key))?.id;
}

/** The pass to run again for a list of issues: the latest one they point to, because later passes can adapt to earlier ones. */
export function passToRetry(issuePaths: readonly string[]): PassId | undefined {
  const implicated = issuePaths
    .map((path) => passOwning(path.split(".")[0] ?? ""))
    .filter((pass): pass is PassId => pass !== undefined);
  return [...PASS_IDS].reverse().find((candidate) => implicated.includes(candidate));
}
