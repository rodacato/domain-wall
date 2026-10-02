import type { Aggregate } from "./schema/Aggregate";
import type { Command } from "./schema/EventStorming";
import type { FieldType } from "./schema/FieldType";

/** Where an event payload field gets its value when the event is emitted. */
export type PayloadSource =
  | { readonly kind: "argument"; readonly type: FieldType }
  | { readonly kind: "aggregateField"; readonly type: FieldType }
  | { readonly kind: "derived"; readonly type: FieldType }
  | { readonly kind: "stateData"; readonly type: FieldType };

/**
 * A payload field is filled by name. Precedence: the command's argument, then a stored field of the
 * aggregate, then a derived value, then data of a state. The same rule is used by semantic
 * validation and by the generators, so they cannot disagree.
 */
export function resolvePayloadSource(
  aggregate: Aggregate,
  command: Command,
  fieldName: string,
): PayloadSource | undefined {
  const argument = command.params.find((param) => param.codeName === fieldName);
  if (argument !== undefined) return { kind: "argument", type: argument.type };
  const stored = aggregate.fields.find((field) => field.codeName === fieldName);
  if (stored !== undefined) return { kind: "aggregateField", type: stored.type };
  const derived = aggregate.derived.find((field) => field.codeName === fieldName);
  if (derived !== undefined) return { kind: "derived", type: derived.type };
  const stateData = aggregate.states
    .flatMap((state) => state.data)
    .find((field) => field.codeName === fieldName);
  return stateData === undefined ? undefined : { kind: "stateData", type: stateData.type };
}

export function fieldTypesAreEqual(left: FieldType, right: FieldType): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
