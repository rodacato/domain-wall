import type { Aggregate } from "../schema/Aggregate";
import type { FieldType } from "../schema/FieldType";
import type { TypeName } from "../naming/CodeName";
import type { ValueRecord } from "./Value";

/** The collection element visible to a `sumOf` term. */
export interface ElementScope {
  /** The entity the element belongs to, when its derived fields may be read; null for record value objects. */
  readonly entityName: TypeName | null;
  readonly object: ValueRecord;
}

export interface EvaluationScope {
  readonly aggregate: Aggregate;
  /** Aggregate fields plus data of the current state. */
  readonly values: ValueRecord;
  readonly args: ValueRecord;
  /** Declared types of the command's parameters, to type collection arguments. */
  readonly argumentTypes: Readonly<Record<string, FieldType>>;
  readonly element: ElementScope | null;
}
