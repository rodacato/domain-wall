import type { PackIndex } from "../../domain/pack/PackIndex";
import {
  createInstance,
  type AggregateInstance,
} from "../../domain/pack/interpreter/AggregateInstance";
import { executeCommand, resolveArguments } from "../../domain/pack/interpreter/executeCommand";
import type { Aggregate, CommandCall } from "../../domain/pack/schema/Aggregate";
import type { Command } from "../../domain/pack/schema/EventStorming";
import type {
  PlannedArgument,
  PlannedStep,
  AggregateTestPlan,
  ValueObjectTestPlan,
  InvalidStateTest,
  RuleViolationTest,
} from "./TestPlan";

function argumentsOf(
  index: PackIndex,
  command: Command,
  call: CommandCall,
): readonly PlannedArgument[] | undefined {
  const resolved = resolveArguments(index, command, call);
  if (!resolved.ok) return undefined;
  return command.params.map((param) => ({
    name: param.codeName,
    type: param.type,
    value: resolved.value[param.codeName] ?? null,
  }));
}

interface Played {
  readonly steps: readonly PlannedStep[];
  readonly instances: readonly AggregateInstance[];
}

/** Plays calls through the interpreter, recording each step's resolved arguments, emitted events and resulting state. */
function play(
  index: PackIndex,
  aggregate: Aggregate,
  calls: readonly CommandCall[],
): Played | undefined {
  const created = createInstance(index, aggregate.codeName);
  if (!created.ok) return undefined;
  let instance = created.value;
  const steps: PlannedStep[] = [];
  const instances: AggregateInstance[] = [instance];
  for (const call of calls) {
    const command = index.commands.get(call.command);
    if (command === undefined) return undefined;
    const planned = argumentsOf(index, command, call);
    const outcome = executeCommand(index, instance, call);
    if (planned === undefined || !outcome.ok) return undefined;
    instance = outcome.value.instance;
    instances.push(instance);
    steps.push({
      command: call.command,
      arguments: planned,
      events: outcome.value.events,
      stateAfter: instance.state,
    });
  }
  return { steps, instances };
}

function violationTests(index: PackIndex, aggregate: Aggregate): readonly RuleViolationTest[] {
  const guards = new Set<string>(aggregate.transitions.flatMap((transition) => transition.guards));
  return aggregate.rules.flatMap((rule) => {
    const given = play(index, aggregate, rule.violation.given);
    const command = index.commands.get(rule.violation.when.command);
    const planned =
      command === undefined ? undefined : argumentsOf(index, command, rule.violation.when);
    if (given === undefined || planned === undefined) return [];
    return [
      {
        rule: rule.codeName,
        phase: guards.has(rule.codeName) ? ("guard" as const) : ("invariant" as const),
        given: given.steps,
        when: { command: rule.violation.when.command, arguments: planned },
      },
    ];
  });
}

/** For each state the walkthrough passes through, one command that must be refused there. */
function invalidStateTests(
  index: PackIndex,
  aggregate: Aggregate,
  walked: Played,
): readonly InvalidStateTest[] {
  const commands = index.pack.commands.filter(
    (command) => command.handledBy === aggregate.codeName,
  );
  const seen = new Set<string>();
  const tests: InvalidStateTest[] = [];
  walked.instances.forEach((instance, position) => {
    if (seen.has(instance.state)) return;
    seen.add(instance.state);
    const refused = commands.find(
      (command) =>
        !aggregate.transitions.some(
          (t) => t.command === command.codeName && t.from.includes(instance.state),
        ),
    );
    const planned =
      refused === undefined
        ? undefined
        : argumentsOf(index, refused, { command: refused.codeName, args: {} });
    if (refused === undefined || planned === undefined) return;
    tests.push({
      state: instance.state,
      given: walked.steps.slice(0, position),
      when: { command: refused.codeName, arguments: planned },
    });
  });
  return tests;
}

export function buildAggregateTestPlan(
  index: PackIndex,
  aggregate: Aggregate,
): AggregateTestPlan | undefined {
  const walked = play(index, aggregate, aggregate.walkthrough);
  const created = createInstance(index, aggregate.codeName);
  if (walked === undefined || !created.ok) return undefined;
  const start = aggregate.fields
    .filter((field) => field.type.kind !== "list" && field.type.kind !== "optional")
    .map((field) => ({
      name: field.codeName,
      type: field.type,
      value: created.value.values[field.codeName] ?? null,
    }));
  return {
    aggregate: aggregate.codeName,
    start,
    walkthrough: walked.steps,
    finalState: walked.instances[walked.instances.length - 1]?.state ?? aggregate.initialState,
    violations: violationTests(index, aggregate),
    invalidStates: invalidStateTests(index, aggregate, walked),
  };
}

export function buildValueObjectTestPlans(index: PackIndex): readonly ValueObjectTestPlan[] {
  return index.pack.valueObjects.flatMap((valueObject) =>
    valueObject.kind !== "scalar"
      ? []
      : [
          {
            valueObject: valueObject.codeName,
            valid: valueObject.examples.valid,
            constraints: valueObject.constraints.map((constraint) => ({
              constraintCode: constraint.errorCode,
              invalidExamples: constraint.invalidExamples,
            })),
          },
        ],
  );
}
