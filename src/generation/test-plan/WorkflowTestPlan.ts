import type { FieldType } from "../../domain/pack/schema/FieldType";
import type { Literal } from "../../domain/pack/schema/Literal";

export interface PlannedField {
  readonly name: string;
  readonly type: FieldType;
  readonly value: Literal;
}

/** A stage of the workflow that fails when a port answers with an error, and which ports it must leave untouched. */
export interface PortFailureTest {
  readonly stage: string;
  readonly code: string;
  /** Ports in workflow order; those after the failing one must not be called. */
  readonly failingPort: string;
}

export interface ValidationFailureTest {
  readonly stage: string;
  readonly field: string;
  readonly value: Literal;
  readonly code: string;
}

export interface PortReceipt {
  readonly port: string;
  readonly fields: readonly PlannedField[];
}

/** What to verify about the workflow, independent of the programming language. */
export interface WorkflowTestPlan {
  /** The raw input that passes every stage: one valid value per field of the first type. */
  readonly input: readonly PlannedField[];
  readonly receipts: readonly PortReceipt[];
  /** Values the compute stages must produce for that input, when they can be worked out. */
  readonly computed: readonly PlannedField[];
  readonly validationFailures: readonly ValidationFailureTest[];
  readonly portFailures: readonly PortFailureTest[];
}
