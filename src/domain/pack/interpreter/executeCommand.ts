import { findTransition, type PackIndex } from "../PackIndex";
import { err, ok, type Result } from "../../shared/Result";
import type { TypeName } from "../naming/CodeName";
import type { Aggregate, CommandCall, Effect, Transition } from "../schema/Aggregate";
import type { Command } from "../schema/EventStorming";
import type { AggregateInstance } from "./AggregateInstance";
import { defaultValue } from "./defaultValue";
import type { EvaluationScope } from "./EvaluationScope";
import { evaluateExpression } from "./evaluateExpression";
import { evaluatePredicate } from "./evaluatePredicate";
import type { Rejection } from "./Rejection";
import { validateValue } from "./validateValue";
import type { Value, ValueRecord } from "./Value";

export interface AcceptedCommand {
  readonly instance: AggregateInstance;
  readonly transition: Transition;
  readonly events: readonly TypeName[];
}

/**
 * Executes a command against an aggregate instance. The order mirrors generated code:
 * 1. arguments are checked at the boundary (smart constructors of value objects);
 * 2. the (command, state) pair must have a transition;
 * 3. guards run in order, the first failing rule rejects;
 * 4. effects produce the next values;
 * 5. invariants are checked against the resulting state.
 */
export function executeCommand(
  index: PackIndex,
  instance: AggregateInstance,
  call: CommandCall,
): Result<AcceptedCommand, Rejection> {
  const aggregate = index.aggregates.get(instance.aggregate);
  const command = index.commands.get(call.command);
  if (aggregate === undefined) return fault(`unknown aggregate ${instance.aggregate}`);
  if (command === undefined) return fault(`unknown command ${call.command}`);
  if (command.handledBy !== aggregate.codeName) {
    return fault(
      `${command.codeName} is handled by ${command.handledBy}, not ${aggregate.codeName}`,
    );
  }

  const args = resolveArguments(index, command, call);
  if (!args.ok) return args;

  const transition = findTransition(aggregate, command.codeName, instance.state);
  if (transition === undefined) {
    return err({
      kind: "invalidStateForCommand",
      command: command.codeName,
      state: instance.state,
    });
  }

  const scope = buildScope(aggregate, command, instance.values, args.value);
  const guardRejection = firstViolatedRule(index, scope, aggregate, transition.guards, "guard");
  if (guardRejection !== null) return err(guardRejection);

  const nextValues = applyEffects(index, scope, transition.effects);
  if (!nextValues.ok) return fault(nextValues.error);

  const nextInstance: AggregateInstance = {
    ...instance,
    state: transition.to,
    values: nextValues.value,
  };
  const invariantScope = buildScope(aggregate, command, nextValues.value, {});
  const invariantRejection = firstViolatedRule(
    index,
    invariantScope,
    aggregate,
    aggregate.invariants,
    "invariant",
  );
  if (invariantRejection !== null) return err(invariantRejection);

  return ok({ instance: nextInstance, transition, events: transition.emits });
}

export function resolveArguments(
  index: PackIndex,
  command: Command,
  call: CommandCall,
): Result<ValueRecord, Rejection> {
  const declared = new Set<string>(command.params.map((param) => param.codeName));
  for (const providedName of Object.keys(call.args)) {
    if (!declared.has(providedName))
      return fault(`${command.codeName} has no parameter ${providedName}`);
  }
  const resolved: Record<string, Value> = {};
  for (const param of command.params) {
    const value = call.args[param.codeName] ?? fallbackArgument(index, command, param);
    if (value instanceof FallbackFailure) return fault(value.message);
    const rejection = validateValue(index, param.type, value, param.codeName);
    if (rejection !== null) return err(rejection);
    resolved[param.codeName] = value;
  }
  return ok(resolved);
}

class FallbackFailure {
  constructor(readonly message: string) {}
}

function fallbackArgument(
  index: PackIndex,
  command: Command,
  param: Command["params"][number],
): Value | FallbackFailure {
  const fallback = defaultValue(index, param.type);
  return fallback.ok
    ? fallback.value
    : new FallbackFailure(`${command.codeName}.${param.codeName}: ${fallback.error}`);
}

function buildScope(
  aggregate: Aggregate,
  command: Command,
  values: ValueRecord,
  args: ValueRecord,
): EvaluationScope {
  return {
    aggregate,
    values,
    args,
    argumentTypes: Object.fromEntries(command.params.map((param) => [param.codeName, param.type])),
    element: null,
  };
}

function firstViolatedRule(
  index: PackIndex,
  scope: EvaluationScope,
  aggregate: Aggregate,
  ruleNames: readonly TypeName[],
  phase: "guard" | "invariant",
): Rejection | null {
  for (const ruleName of ruleNames) {
    const rule = aggregate.rules.find((candidate) => candidate.codeName === ruleName);
    if (rule === undefined) return { kind: "fault", message: `unknown rule ${ruleName}` };
    const holds = evaluatePredicate(index, scope, rule.predicate);
    if (!holds.ok) return { kind: "fault", message: `${ruleName}: ${holds.error}` };
    if (!holds.value) return { kind: "ruleViolated", rule: rule.codeName, phase };
  }
  return null;
}

/** Every effect reads the state before the transition, so effect order does not matter. */
function applyEffects(
  index: PackIndex,
  scope: EvaluationScope,
  effects: readonly Effect[],
): Result<ValueRecord, string> {
  const next: Record<string, Value> = { ...scope.values };
  for (const effect of effects) {
    const value = evaluateExpression(index, scope, effect.value);
    if (!value.ok) return value;
    if (effect.op === "set") {
      next[effect.field] = value.value;
      continue;
    }
    const current = scope.values[effect.field];
    if (!Array.isArray(current)) return err(`cannot append to ${effect.field}: it is not a list`);
    next[effect.field] = [...current, value.value];
  }
  return ok(next);
}

function fault(message: string): Result<never, Rejection> {
  return err({ kind: "fault", message });
}
