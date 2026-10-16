/** What the railway shows: the types that change stage by stage, a stage that refuses the wrong type, or a token running. */
export type PipelineView = "hidden" | "types" | "mismatch" | "run";

export interface PipelineStageState {
  readonly view: PipelineView;
  /** Failures injected from the start, by stage code name and error code name. */
  readonly failures: Readonly<Record<string, string>>;
  /** Whether the learner may inject failures and run the token again. */
  readonly interactive: boolean;
}

export const HIDDEN_PIPELINE: PipelineStageState = {
  view: "hidden",
  failures: {},
  interactive: false,
};
