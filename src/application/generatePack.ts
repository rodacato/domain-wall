import { z } from "zod";
import type { ProgrammingLanguageId } from "../domain/language/ProgrammingLanguage";
import { PROGRAMMING_LANGUAGES } from "../domain/language/ProgrammingLanguage";
import { buildPackIndex } from "../domain/pack/PackIndex";
import { parseDomainPack } from "../domain/pack/parseDomainPack";
import {
  validateSemantics,
  type SemanticallyValidPack,
} from "../domain/pack/validation/validateSemantics";
import { assembleDraft, packIdFor } from "../domain/packGeneration/assembleDraft";
import { packCacheKey } from "../domain/packGeneration/cacheKey";
import {
  PASS_IDS,
  passDefinition,
  passToRetry,
  type PackDraft,
  type PassId,
} from "../domain/packGeneration/passes";
import { err, ok, type Result } from "../domain/shared/Result";
import type { ValidationIssue } from "../domain/shared/ValidationIssue";
import type { LlmProvider } from "../ports/LlmProvider";
import { generateCode } from "./generateCode";
import type { TemplatesByLanguage } from "./loadTemplates";
import { buildPassPrompt, exampleFor } from "./packPrompts";

/** What the generation scene shows as it goes: each gate the pack passes, and each time it is sent back. */
export type GenerationEvent =
  | { readonly kind: "passStarted"; readonly pass: PassId; readonly attempt: number }
  | {
      readonly kind: "passAnswered";
      readonly pass: PassId;
      readonly counts: Readonly<Record<string, number>>;
    }
  | {
      readonly kind: "passRestored";
      readonly pass: PassId;
      readonly counts: Readonly<Record<string, number>>;
    }
  | {
      readonly kind: "passRefused";
      readonly pass: PassId;
      readonly gate: "schema";
      readonly issues: readonly ValidationIssue[];
    }
  | {
      readonly kind: "semanticsRefused";
      readonly issues: readonly ValidationIssue[];
      readonly retrying: PassId;
    }
  | { readonly kind: "semanticsPassed" }
  | {
      readonly kind: "codeChecked";
      readonly language: ProgrammingLanguageId;
      readonly passed: boolean;
    }
  | { readonly kind: "done"; readonly attempts: number };

export type GenerationFailure =
  | { readonly kind: "unavailable"; readonly message: string }
  | { readonly kind: "aborted" }
  | { readonly kind: "exhausted"; readonly issues: readonly ValidationIssue[] };

export interface GenerationInput {
  readonly description: string;
  readonly locales: readonly ("es-MX" | "en")[];
  readonly model: string;
}

export interface GenerationDependencies {
  readonly provider: LlmProvider;
  readonly templates: TemplatesByLanguage;
  /** A known-good pack whose pieces show the model the shape of an answer. */
  readonly example: PackDraft;
  readonly onEvent?: (event: GenerationEvent) => void;
  /** What an earlier, unfinished generation of the same request produced; each part is checked again before it is used. */
  readonly resumeFrom?: PackDraft;
  /** Called with everything produced so far each time a pass is answered, so a failure does not lose it. */
  readonly onDraft?: (draft: PackDraft) => void;
  readonly signal?: AbortSignal;
  readonly attemptsPerPass?: number;
  readonly repairRounds?: number;
}

const DEFAULT_ATTEMPTS_PER_PASS = 3;
const DEFAULT_REPAIR_ROUNDS = 3;

function schemaIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    ruleId: "schema",
    path: issue.path.map(String).join("."),
    message: issue.message,
  }));
}

function countsOf(output: Record<string, unknown>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(output).map(([key, value]) => [key, Array.isArray(value) ? value.length : 1]),
  );
}

type PassOutcome = Result<PackDraft, GenerationFailure>;

async function runPass(
  pass: PassId,
  input: GenerationInput,
  draft: PackDraft,
  issues: readonly ValidationIssue[],
  dependencies: GenerationDependencies,
): Promise<PassOutcome> {
  const { provider, onEvent } = dependencies;
  const definition = passDefinition(pass);
  const jsonSchema = z.toJSONSchema(definition.schema);
  let pending = issues;
  const attempts = dependencies.attemptsPerPass ?? DEFAULT_ATTEMPTS_PER_PASS;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    onEvent?.({ kind: "passStarted", pass, attempt });
    const prompt = buildPassPrompt({
      pass,
      description: input.description,
      draft,
      issues: pending,
      example: exampleFor(pass, dependencies.example),
      jsonSchema,
    });
    const answer = await provider.generateStructured({
      ...prompt,
      label: pass,
      ...(dependencies.signal === undefined ? {} : { signal: dependencies.signal }),
    });
    if (!answer.ok) {
      return err(
        answer.error.kind === "aborted"
          ? { kind: "aborted" }
          : { kind: "unavailable", message: answer.error.message },
      );
    }
    const parsed = definition.schema.safeParse(answer.value);
    if (parsed.success) {
      const output = parsed.data as PackDraft;
      onEvent?.({
        kind: "passAnswered",
        pass,
        counts: countsOf(output),
      });
      return ok({ ...draft, ...output });
    }
    pending = schemaIssues(parsed.error);
    onEvent?.({ kind: "passRefused", pass, gate: "schema", issues: pending });
  }
  return err({ kind: "exhausted", issues: pending });
}

function codeIssues(
  pack: SemanticallyValidPack,
  templates: TemplatesByLanguage,
  onEvent: GenerationDependencies["onEvent"],
): ValidationIssue[] {
  const index = buildPackIndex(pack);
  return PROGRAMMING_LANGUAGES.flatMap((language) => {
    const generated = generateCode(index, language, templates);
    onEvent?.({ kind: "codeChecked", language, passed: generated.ok });
    return generated.ok
      ? []
      : generated.error.map((message) => ({ ruleId: "code", path: language, message }));
  });
}

/**
 * Generates a pack in passes, then checks it as a whole (schema, meaning, code in every language) and
 * sends the pass an issue points to back for another try, until it passes or the attempts run out.
 */
export async function generatePack(
  input: GenerationInput,
  dependencies: GenerationDependencies,
): Promise<Result<SemanticallyValidPack, GenerationFailure>> {
  const { onEvent } = dependencies;
  const key = packCacheKey({
    description: input.description,
    locales: input.locales,
    model: input.model,
  });
  let draft: PackDraft = {};
  let attempts = 0;

  for (const pass of PASS_IDS) {
    const restored = restoredPart(pass, dependencies.resumeFrom);
    if (restored !== null) {
      draft = { ...draft, ...restored };
      onEvent?.({ kind: "passRestored", pass, counts: countsOf(restored) });
      continue;
    }
    attempts += 1;
    const outcome = await runPass(pass, input, draft, [], dependencies);
    if (!outcome.ok) return outcome;
    draft = outcome.value;
    dependencies.onDraft?.(draft);
  }

  let lastIssues: readonly ValidationIssue[] = [];
  const rounds = dependencies.repairRounds ?? DEFAULT_REPAIR_ROUNDS;
  for (let round = 0; round <= rounds; round += 1) {
    const businessName = draft.business?.name.en ?? "business";
    const candidate = assembleDraft(draft, {
      packId: packIdFor(businessName, key),
      model: input.model,
      attempts,
      locales: input.locales,
    });
    const parsed = parseDomainPack(candidate);
    const checked = parsed.ok ? validateSemantics(parsed.value) : parsed;
    if (checked.ok) {
      onEvent?.({ kind: "semanticsPassed" });
      const failures = codeIssues(checked.value, dependencies.templates, onEvent);
      if (failures.length === 0) {
        onEvent?.({ kind: "done", attempts });
        return ok(checked.value);
      }
      lastIssues = failures;
    } else {
      lastIssues = checked.error;
    }

    const retrying =
      passToRetry(lastIssues.map((issue) => issue.path)) ??
      PASS_IDS[PASS_IDS.length - 1] ??
      "narrative";
    if (round === rounds) break;
    onEvent?.({ kind: "semanticsRefused", issues: lastIssues, retrying });
    attempts += 1;
    const outcome = await runPass(
      retrying,
      input,
      withoutPass(draft, retrying),
      lastIssues,
      dependencies,
    );
    if (!outcome.ok) return outcome;
    draft = outcome.value;
    dependencies.onDraft?.(draft);
  }
  return err({ kind: "exhausted", issues: lastIssues });
}

/** The part of a saved draft a pass owns, if all of it is there and still follows the pass's schema. */
function restoredPart(pass: PassId, saved: PackDraft | undefined): PackDraft | null {
  if (saved === undefined) return null;
  const definition = passDefinition(pass);
  if (definition.keys.some((key) => saved[key] === undefined)) return null;
  const part = Object.fromEntries(definition.keys.map((key) => [key, saved[key]]));
  const parsed = definition.schema.safeParse(part);
  return parsed.success ? (parsed.data as PackDraft) : null;
}

/** The draft as it was before a pass ran, so the pass answers anew instead of patching its old answer. */
function withoutPass(draft: PackDraft, pass: PassId): PackDraft {
  const keys = new Set<string>(passDefinition(pass).keys);
  return Object.fromEntries(Object.entries(draft).filter(([key]) => !keys.has(key)));
}
