import type { PackIndex } from "./PackIndex";

export interface OutlinedTransition {
  readonly command: string;
  readonly from: readonly string[];
  readonly to: string;
  readonly guards: readonly string[];
  readonly emits: readonly string[];
}

/** An aggregate seen from the outside: the states it moves through, what moves it and what it promises. */
export interface AggregateOutline {
  readonly aggregate: string;
  readonly initialState: string;
  readonly states: readonly { readonly codeName: string; readonly terminal: boolean }[];
  readonly transitions: readonly OutlinedTransition[];
  readonly invariants: readonly string[];
}

export function outlineAggregate(
  index: PackIndex,
  aggregateName: string,
): AggregateOutline | undefined {
  const aggregate = index.aggregates.get(aggregateName);
  if (aggregate === undefined) return undefined;
  return {
    aggregate: aggregate.codeName,
    initialState: aggregate.initialState,
    states: aggregate.states.map((state) => ({
      codeName: state.codeName,
      terminal: state.terminal,
    })),
    transitions: aggregate.transitions.map((transition) => ({
      command: transition.command,
      from: transition.from,
      to: transition.to,
      guards: transition.guards,
      emits: transition.emits,
    })),
    invariants: aggregate.invariants,
  };
}
