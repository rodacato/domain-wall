import type { ProgrammingLanguageId } from "../domain/language/ProgrammingLanguage";
import { PASS_IDS, type PassId } from "../domain/packGeneration/passes";
import type { ValidationIssue } from "../domain/shared/ValidationIssue";
import type { GenerationEvent } from "./generatePack";

export interface PassSummary {
  readonly status: "waiting" | "running" | "answered";
  readonly attempts: number;
  /** How many items the pass produced, by part of the pack. */
  readonly counts: Readonly<Record<string, number>>;
  /** The problems the schema found in the last refused answer, if the pass is being asked again. */
  readonly schemaIssues: readonly ValidationIssue[];
}

export interface Refusal {
  readonly retrying: PassId;
  readonly issues: readonly ValidationIssue[];
}

export interface GenerationSummary {
  readonly passes: Readonly<Record<PassId, PassSummary>>;
  readonly meaning: "pending" | "passed";
  readonly refusals: readonly Refusal[];
  readonly code: Readonly<Partial<Record<ProgrammingLanguageId, boolean>>>;
  readonly done: boolean;
}

const WAITING: PassSummary = { status: "waiting", attempts: 0, counts: {}, schemaIssues: [] };

/** What the generation scene draws, folded from the events so far. */
export function summarizeGeneration(events: readonly GenerationEvent[]): GenerationSummary {
  const passes = Object.fromEntries(PASS_IDS.map((pass) => [pass, WAITING])) as Record<
    PassId,
    PassSummary
  >;
  let meaning: GenerationSummary["meaning"] = "pending";
  const refusals: Refusal[] = [];
  const code: Partial<Record<ProgrammingLanguageId, boolean>> = {};
  let done = false;

  for (const event of events) {
    switch (event.kind) {
      case "passStarted":
        passes[event.pass] = { ...passes[event.pass], status: "running", attempts: event.attempt };
        break;
      case "passAnswered":
      case "passRestored":
        passes[event.pass] = {
          ...passes[event.pass],
          status: "answered",
          counts: event.counts,
          schemaIssues: [],
        };
        break;
      case "passRefused":
        passes[event.pass] = { ...passes[event.pass], schemaIssues: event.issues };
        break;
      case "semanticsRefused":
        meaning = "pending";
        refusals.push({ retrying: event.retrying, issues: event.issues });
        break;
      case "semanticsPassed":
        meaning = "passed";
        break;
      case "codeChecked":
        code[event.language] = event.passed;
        break;
      case "done":
        done = true;
        break;
    }
  }
  return { passes, meaning, refusals, code, done };
}
