import type { PackIndex } from "../PackIndex";

export type StageOutcome = "passed" | "failed" | "skipped";

export interface StageRun {
  readonly stage: string;
  readonly outcome: StageOutcome;
  /** The error code that stopped the pipeline at this stage. */
  readonly error: string | null;
}

/** Runs the workflow stage by stage; the first injected failure ends the run and the stages after it are skipped. */
export function runWorkflow(
  index: PackIndex,
  failures: Readonly<Record<string, string>>,
): readonly StageRun[] {
  let stopped = false;
  return index.pack.workflow.stages.map((stage) => {
    if (stopped) return { stage: stage.codeName, outcome: "skipped", error: null };
    const injected = failures[stage.codeName];
    const known =
      injected !== undefined && stage.errors.some((error) => error.codeName === injected);
    if (!known) return { stage: stage.codeName, outcome: "passed", error: null };
    stopped = true;
    return { stage: stage.codeName, outcome: "failed", error: injected };
  });
}
