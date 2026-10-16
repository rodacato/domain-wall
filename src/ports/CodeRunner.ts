import type { ProgrammingLanguageId } from "../domain/language/ProgrammingLanguage";
import type { RunOutcome } from "../domain/execution/RunOutcome";
import type { Result } from "../domain/shared/Result";

export interface RunRequest {
  readonly language: ProgrammingLanguageId;
  readonly files: readonly { readonly path: string; readonly content: string }[];
  /** The file that runs every test when executed. */
  readonly testEntry: string;
  readonly timeoutMs: number;
}

export type RunnerError =
  | { readonly kind: "unavailable"; readonly message: string }
  | { readonly kind: "timedOut"; readonly afterMs: number }
  | { readonly kind: "refused"; readonly message: string };

/** Runs, or at least checks, a small project of generated files. */
export interface CodeRunner {
  run(request: RunRequest): Promise<Result<RunOutcome, RunnerError>>;
}
