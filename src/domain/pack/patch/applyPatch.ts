import { err, ok, type Result } from "../../shared/Result";
import { issueAt, type ValidationIssue } from "../../shared/ValidationIssue";
import type { Aggregate } from "../schema/Aggregate";
import type { PatchOperation } from "../schema/ChangeScenario";
import type { DomainPack } from "../schema/DomainPack";

/** Applies a business change to a pack, producing a new pack. The original is never modified. */
export function applyPatch(
  pack: DomainPack,
  operations: readonly PatchOperation[],
): Result<DomainPack, readonly ValidationIssue[]> {
  let current = pack;
  const issues: ValidationIssue[] = [];

  for (const [position, operation] of operations.entries()) {
    const outcome = applyOperation(current, operation);
    if (outcome.ok) {
      current = outcome.value;
    } else {
      issues.push(issueAt("patch", [String(position), operation.op], outcome.error));
    }
  }
  return issues.length > 0 ? err(issues) : ok(current);
}

function applyOperation(pack: DomainPack, operation: PatchOperation): Result<DomainPack, string> {
  switch (operation.op) {
    case "addValueObject":
      return ok({ ...pack, valueObjects: [...pack.valueObjects, operation.valueObject] });
    case "addEvent":
      return ok({ ...pack, events: [...pack.events, operation.event] });
    case "addCommand":
      return ok({ ...pack, commands: [...pack.commands, operation.command] });
    case "addState":
      return updateAggregate(pack, operation.aggregate, (aggregate) =>
        ok({ ...aggregate, states: [...aggregate.states, operation.state] }),
      );
    case "addRule":
      return updateAggregate(pack, operation.aggregate, (aggregate) =>
        ok({ ...aggregate, rules: [...aggregate.rules, operation.rule] }),
      );
    case "addTransition":
      return updateAggregate(pack, operation.aggregate, (aggregate) =>
        ok({ ...aggregate, transitions: [...aggregate.transitions, operation.transition] }),
      );
    case "replaceWalkthrough":
      return updateAggregate(pack, operation.aggregate, (aggregate) =>
        ok({ ...aggregate, walkthrough: operation.walkthrough }),
      );
    case "restrictTransition":
      return updateAggregate(pack, operation.aggregate, (aggregate) => {
        const matching = aggregate.transitions.filter(
          (transition) => transition.command === operation.command,
        );
        if (matching.length === 0) return err(`no transition for command "${operation.command}"`);
        const restricted = aggregate.transitions.flatMap((transition) => {
          if (transition.command !== operation.command) return [transition];
          const remaining = transition.from.filter(
            (from) => !operation.removeFrom.some((removed) => removed === from),
          );
          return remaining.length === 0 ? [] : [{ ...transition, from: remaining }];
        });
        return ok({ ...aggregate, transitions: restricted });
      });
  }
}

function updateAggregate(
  pack: DomainPack,
  aggregateName: string,
  update: (aggregate: Aggregate) => Result<Aggregate, string>,
): Result<DomainPack, string> {
  const target = pack.aggregates.find((aggregate) => aggregate.codeName === aggregateName);
  if (target === undefined) return err(`aggregate "${aggregateName}" does not exist`);
  const updated = update(target);
  if (!updated.ok) return updated;
  return ok({
    ...pack,
    aggregates: pack.aggregates.map((aggregate) =>
      aggregate === target ? updated.value : aggregate,
    ),
  });
}
