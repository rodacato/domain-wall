import type { PackIndex } from "../PackIndex";
import { err, ok, type Result } from "../../shared/Result";
import type { TypeName } from "../naming/CodeName";
import { defaultValue } from "./defaultValue";
import type { Value, ValueRecord } from "./Value";

/** A running aggregate: its current state and the values of its fields and state data. */
export interface AggregateInstance {
  readonly aggregate: TypeName;
  readonly state: TypeName;
  readonly values: ValueRecord;
}

/** Creates an aggregate in its initial state, with every field at its default value. */
export function createInstance(
  index: PackIndex,
  aggregateName: string,
): Result<AggregateInstance, string> {
  const aggregate = index.aggregates.get(aggregateName);
  if (aggregate === undefined) return err(`unknown aggregate ${aggregateName}`);
  const values: Record<string, Value> = {};
  for (const field of aggregate.fields) {
    const initial = defaultValue(index, field.type);
    if (!initial.ok) return err(`${aggregate.codeName}.${field.codeName}: ${initial.error}`);
    values[field.codeName] = initial.value;
  }
  for (const stateData of aggregate.states.flatMap((state) => state.data)) {
    values[stateData.codeName] = null;
  }
  return ok({ aggregate: aggregate.codeName, state: aggregate.initialState, values });
}
