import type { PackIndex } from "../../domain/pack/PackIndex";
import type { Aggregate } from "../../domain/pack/schema/Aggregate";
import type { FieldType } from "../../domain/pack/schema/FieldType";

/** The concepts of the pack that the tactical modules point at, chosen once so every module talks about the same ones. */
export interface TacticalFocus {
  /** The aggregate the course follows: the one that handles the workflow's trigger. */
  readonly aggregate: Aggregate;
  /** A scalar value object with constraints, preferably one the aggregate uses. */
  readonly valueObject: string | null;
  /** The aggregate that holds an entity (the hero when it has one) and that entity. */
  readonly entityHost: { readonly aggregate: Aggregate; readonly entity: string } | null;
  /** A rule that must hold after every transition, or else the first guard. */
  readonly rule: { readonly name: string; readonly kind: "invariant" | "rule" };
  /** An event the aggregate emits, preferably on the trigger of the workflow. */
  readonly event: string;
  readonly command: string;
}

function referencedValueObjects(type: FieldType): readonly string[] {
  switch (type.kind) {
    case "valueObject":
      return [type.ref];
    case "list":
    case "optional":
      return referencedValueObjects(type.of);
    case "primitive":
    case "entity":
      return [];
  }
}

function heroAggregate(index: PackIndex): Aggregate | undefined {
  const trigger = index.commands.get(index.pack.workflow.trigger);
  const handler = trigger === undefined ? undefined : index.aggregates.get(trigger.handledBy);
  return handler ?? index.pack.aggregates[0];
}

/** A numeric scalar with constraints reads best ("at least 1"), so those come first. */
function constrainedScalar(index: PackIndex, names: readonly string[]): string | undefined {
  const constrained = names.filter((name) => {
    const valueObject = index.valueObjects.get(name);
    return valueObject?.kind === "scalar" && valueObject.constraints.length > 0;
  });
  return (
    constrained.find((name) => {
      const valueObject = index.valueObjects.get(name);
      return valueObject?.kind === "scalar" && valueObject.base === "integer";
    }) ?? constrained[0]
  );
}

export function tacticalFocus(index: PackIndex): TacticalFocus | undefined {
  const aggregate = heroAggregate(index);
  const firstTransition = aggregate?.transitions[0];
  if (aggregate === undefined || firstTransition === undefined) return undefined;

  const commandParams = index.pack.commands
    .filter((command) => command.handledBy === aggregate.codeName)
    .flatMap((command) => command.params.map((param) => param.type));
  const used = [...aggregate.fields.map((field) => field.type), ...commandParams].flatMap(
    referencedValueObjects,
  );
  const valueObject =
    constrainedScalar(index, used) ??
    constrainedScalar(
      index,
      index.pack.valueObjects.map((candidate) => candidate.codeName),
    ) ??
    null;

  const hostAggregate =
    aggregate.entities.length > 0
      ? aggregate
      : index.pack.aggregates.find((candidate) => candidate.entities.length > 0);
  const hostEntity = hostAggregate?.entities[0];

  const invariant = aggregate.invariants[0];
  const guard = aggregate.transitions.flatMap((transition) => transition.guards)[0];
  const ruleName = invariant ?? guard ?? aggregate.rules[0]?.codeName;
  if (ruleName === undefined) return undefined;

  const trigger = aggregate.transitions.find(
    (transition) => transition.command === index.pack.workflow.trigger,
  );
  const emitting = trigger ?? firstTransition;

  return {
    aggregate,
    valueObject,
    entityHost:
      hostAggregate === undefined || hostEntity === undefined
        ? null
        : { aggregate: hostAggregate, entity: hostEntity.codeName },
    rule: { name: ruleName, kind: invariant === undefined ? "rule" : "invariant" },
    event: emitting.emits[0] ?? firstTransition.emits[0] ?? "",
    command: emitting.command,
  };
}
