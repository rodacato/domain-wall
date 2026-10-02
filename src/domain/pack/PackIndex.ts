import type { DomainPack } from "./schema/DomainPack";
import type { Aggregate, Entity, Rule, State, Transition } from "./schema/Aggregate";
import type { Command, DomainEvent, Policy } from "./schema/EventStorming";
import type { ValueObject } from "./schema/ValueObject";

type ByCodeName<Concept extends { readonly codeName: string }> = ReadonlyMap<string, Concept>;

function indexByCodeName<Concept extends { readonly codeName: string }>(
  concepts: readonly Concept[],
): ByCodeName<Concept> {
  return new Map(concepts.map((concept) => [concept.codeName, concept]));
}

/** Lookup tables over a pack, built once per validation or interpretation run. */
export interface PackIndex {
  readonly pack: DomainPack;
  readonly aggregates: ByCodeName<Aggregate>;
  readonly valueObjects: ByCodeName<ValueObject>;
  readonly events: ByCodeName<DomainEvent>;
  readonly commands: ByCodeName<Command>;
  readonly policies: ByCodeName<Policy>;
  readonly contexts: ReadonlyMap<string, DomainPack["contexts"][number]>;
  readonly actors: ReadonlyMap<string, DomainPack["actors"][number]>;
  readonly externalSystems: ReadonlyMap<string, DomainPack["externalSystems"][number]>;
  readonly experts: ReadonlyMap<string, DomainPack["experts"][number]>;
  /** Entities by code name, with the aggregate that owns them. */
  readonly entities: ReadonlyMap<
    string,
    { readonly entity: Entity; readonly aggregate: Aggregate }
  >;
}

export function buildPackIndex(pack: DomainPack): PackIndex {
  return {
    pack,
    aggregates: indexByCodeName(pack.aggregates),
    valueObjects: indexByCodeName(pack.valueObjects),
    events: indexByCodeName(pack.events),
    commands: indexByCodeName(pack.commands),
    policies: indexByCodeName(pack.policies),
    contexts: indexByCodeName(pack.contexts),
    actors: indexByCodeName(pack.actors),
    externalSystems: indexByCodeName(pack.externalSystems),
    experts: indexByCodeName(pack.experts),
    entities: new Map(
      pack.aggregates.flatMap((aggregate) =>
        aggregate.entities.map((entity) => [entity.codeName, { entity, aggregate }] as const),
      ),
    ),
  };
}

export function findRule(aggregate: Aggregate, ruleName: string): Rule | undefined {
  return aggregate.rules.find((rule) => rule.codeName === ruleName);
}

export function findState(aggregate: Aggregate, stateName: string): State | undefined {
  return aggregate.states.find((state) => state.codeName === stateName);
}

export function findTransition(
  aggregate: Aggregate,
  commandName: string,
  stateName: string,
): Transition | undefined {
  return aggregate.transitions.find(
    (transition) =>
      transition.command === commandName && transition.from.some((from) => from === stateName),
  );
}
