import type { PackIndex } from "../PackIndex";
import { err, ok, type Result } from "../../shared/Result";
import type { CommandCall, Scenario } from "../schema/Aggregate";
import { createInstance, type AggregateInstance } from "./AggregateInstance";
import { executeCommand } from "./executeCommand";
import { describeRejection, type Rejection } from "./Rejection";

/** A scenario that cannot even be played: a setup step was rejected or the pack is inconsistent. */
export interface ScenarioFault {
  readonly message: string;
}

function playCommands(
  index: PackIndex,
  start: AggregateInstance,
  calls: readonly CommandCall[],
  purpose: string,
): Result<AggregateInstance, ScenarioFault> {
  let instance = start;
  for (const [position, call] of calls.entries()) {
    const outcome = executeCommand(index, instance, call);
    if (!outcome.ok) {
      return err({
        message: `${purpose} step ${position + 1} (${call.command}) was rejected: ${describeRejection(outcome.error)}`,
      });
    }
    instance = outcome.value.instance;
  }
  return ok(instance);
}

/**
 * Plays `given` (every step must be accepted) and then `when`. Returns the rejection of `when`,
 * or null if `when` was accepted.
 */
export function runScenario(
  index: PackIndex,
  aggregateName: string,
  scenario: Scenario,
): Result<Rejection | null, ScenarioFault> {
  const initial = createInstance(index, aggregateName);
  if (!initial.ok) return err({ message: initial.error });
  const prepared = playCommands(index, initial.value, scenario.given, "given");
  if (!prepared.ok) return prepared;
  const outcome = executeCommand(index, prepared.value, scenario.when);
  return ok(outcome.ok ? null : outcome.error);
}

export interface WalkthroughResult {
  readonly finalInstance: AggregateInstance;
}

/** Plays a happy path; every step must be accepted. */
export function runWalkthrough(
  index: PackIndex,
  aggregateName: string,
  walkthrough: readonly CommandCall[],
): Result<WalkthroughResult, ScenarioFault> {
  const initial = createInstance(index, aggregateName);
  if (!initial.ok) return err({ message: initial.error });
  const finished = playCommands(index, initial.value, walkthrough, "walkthrough");
  return finished.ok ? ok({ finalInstance: finished.value }) : finished;
}
