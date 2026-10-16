import type { Literal } from "../../domain/pack/schema/Literal";
import type { FieldType } from "../../domain/pack/schema/FieldType";

export interface PlannedArgument {
  readonly name: string;
  readonly type: FieldType;
  readonly value: Literal;
}

export interface PlannedStep {
  readonly command: string;
  readonly arguments: readonly PlannedArgument[];
  readonly events: readonly string[];
  readonly stateAfter: string;
}

export interface RuleViolationTest {
  readonly rule: string;
  readonly phase: "guard" | "invariant";
  readonly given: readonly PlannedStep[];
  readonly when: Pick<PlannedStep, "command" | "arguments">;
}

export interface InvalidStateTest {
  readonly state: string;
  readonly given: readonly PlannedStep[];
  readonly when: Pick<PlannedStep, "command" | "arguments">;
}

/** What to verify about one aggregate, independent of the programming language; the interpreter is the oracle. */
export interface AggregateTestPlan {
  readonly aggregate: string;
  readonly start: readonly PlannedArgument[];
  readonly walkthrough: readonly PlannedStep[];
  readonly finalState: string;
  readonly violations: readonly RuleViolationTest[];
  readonly invalidStates: readonly InvalidStateTest[];
}

export interface ConstraintTest {
  readonly constraintCode: string;
  readonly invalidExamples: readonly Literal[];
}

export interface ValueObjectTestPlan {
  readonly valueObject: string;
  readonly valid: readonly Literal[];
  readonly constraints: readonly ConstraintTest[];
}
