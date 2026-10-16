import type { PackIndex } from "./PackIndex";
import type { Aggregate } from "./schema/Aggregate";

/** The aggregate the course follows: the one that handles the workflow's trigger, or else the first. */
export function heroAggregate(index: PackIndex): Aggregate | undefined {
  const trigger = index.commands.get(index.pack.workflow.trigger);
  const handler = trigger === undefined ? undefined : index.aggregates.get(trigger.handledBy);
  return handler ?? index.pack.aggregates[0];
}
