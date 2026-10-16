/** A generated source unit the code stage can show; the file it lives in depends on the programming language. */
export type CodeUnit =
  | { readonly kind: "valueObjects" }
  | { readonly kind: "events" }
  | { readonly kind: "workflow" }
  | { readonly kind: "adapter"; readonly aggregate: string }
  | { readonly kind: "aggregate"; readonly aggregate: string };

/** How close the camera is: hidden, the opened aggregate drawn as notes, or its generated code. */
export type CodeLevel = "hidden" | "aggregate" | "code";

/** Whether the learner only reads the code, may attack the aggregate's rules, or sees what the business change did to it. */
export type CodeMode = "read" | "breakInvariants" | "diff";

export interface CodeStageState {
  readonly level: CodeLevel;
  readonly unit: CodeUnit | null;
  /** Anchor reference whose lines stand out while the rest of the file recedes. */
  readonly focus: string | null;
  readonly mode: CodeMode;
}

export const HIDDEN_CODE_STAGE: CodeStageState = {
  level: "hidden",
  unit: null,
  focus: null,
  mode: "read",
};

export function sameCodeUnit(a: CodeUnit | null, b: CodeUnit | null): boolean {
  if (a === null || b === null) return a === b;
  if (a.kind === "aggregate" && b.kind === "aggregate") return a.aggregate === b.aggregate;
  if (a.kind === "adapter" && b.kind === "adapter") return a.aggregate === b.aggregate;
  return a.kind === b.kind;
}
