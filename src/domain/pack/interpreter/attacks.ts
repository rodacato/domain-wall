import type { PackIndex } from "../PackIndex";
import type { Rejection } from "./Rejection";
import { runScenario } from "./runScenario";

/** A command that tries to break a rule, with what the aggregate answers when it is played. */
export interface Attack {
  readonly rule: string;
  readonly command: string;
  readonly phase: "guard" | "invariant";
  readonly rejection: Rejection;
}

/** The attacks the pack proposes on an aggregate, one per rule, each played by the reference interpreter. */
export function attacksOn(index: PackIndex, aggregateName: string): readonly Attack[] {
  const aggregate = index.aggregates.get(aggregateName);
  if (aggregate === undefined) return [];
  return aggregate.rules.flatMap((rule) => {
    const played = runScenario(index, aggregateName, rule.violation);
    if (!played.ok || played.value === null) return [];
    const rejection = played.value;
    if (rejection.kind !== "ruleViolated" || rejection.rule !== rule.codeName) return [];
    return [
      {
        rule: rule.codeName,
        command: rule.violation.when.command,
        phase: rejection.phase,
        rejection,
      },
    ];
  });
}
