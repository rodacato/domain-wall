import type { LocalizedText } from "../locale/LocalizedText";
import type { PackIndex } from "./PackIndex";

/** What a generated line implements; the generator names its anchors with these kinds. */
export type AnchorKind =
  | "aggregate"
  | "command"
  | "rule"
  | "invariant"
  | "state"
  | "entity"
  | "transition"
  | "factory"
  | "repository"
  | "event"
  | "valueObject"
  | "workflow"
  | "workflowType"
  | "workflowPort"
  | "workflowStage"
  | "workflowStep";

export interface AnchorRef {
  readonly kind: AnchorKind;
  /** The aggregate that owns the anchor, when it has one. */
  readonly aggregate: string | null;
  /** The concept the anchor names: a command, rule, state, entity, event or value object. */
  readonly name: string | null;
}

const WORKFLOW_PARTS: Readonly<Record<string, AnchorKind>> = {
  type: "workflowType",
  port: "workflowPort",
  stage: "workflowStage",
  step: "workflowStep",
};

const AGGREGATE_MEMBER_KINDS = ["command", "rule", "invariant", "state", "entity", "transition"];

/** Reads references such as "Order", "Order.rule.OrderMustHaveLines", "event.OrderPlaced" or "valueObject.Money". */
export function parseAnchorRef(ref: string): AnchorRef | undefined {
  const parts = ref.split(".");
  const [first, second, third] = parts;
  if (first === undefined) return undefined;
  if (first === "event" && second !== undefined) {
    return { kind: "event", aggregate: null, name: second };
  }
  if (first === "valueObject" && second !== undefined) {
    return { kind: "valueObject", aggregate: null, name: second };
  }
  if (first === "workflow" && second !== undefined) {
    const part = WORKFLOW_PARTS[second];
    if (part !== undefined && third !== undefined)
      return { kind: part, aggregate: null, name: third };
    return { kind: "workflow", aggregate: null, name: second };
  }
  if (second === undefined) return { kind: "aggregate", aggregate: first, name: null };
  if (second === "factory" || second === "repository") {
    return { kind: second, aggregate: first, name: null };
  }
  if (third !== undefined && AGGREGATE_MEMBER_KINDS.includes(second)) {
    return { kind: second as AnchorKind, aggregate: first, name: third };
  }
  return undefined;
}

/** The pack's own label for the concept an anchor stands for; undefined for factory and repository, which the UI names. */
export function labelOfAnchor(index: PackIndex, ref: string): LocalizedText | undefined {
  const parsed = parseAnchorRef(ref);
  if (parsed === undefined) return undefined;
  const aggregate = parsed.aggregate === null ? undefined : index.aggregates.get(parsed.aggregate);
  switch (parsed.kind) {
    case "aggregate":
      return aggregate?.label;
    case "command":
    case "transition":
      return parsed.name === null ? undefined : index.commands.get(parsed.name)?.label;
    case "rule":
    case "invariant":
      return aggregate?.rules.find((rule) => rule.codeName === parsed.name)?.label;
    case "state":
      return aggregate?.states.find((state) => state.codeName === parsed.name)?.label;
    case "entity":
      return aggregate?.entities.find((entity) => entity.codeName === parsed.name)?.label;
    case "event":
      return parsed.name === null ? undefined : index.events.get(parsed.name)?.label;
    case "valueObject":
      return parsed.name === null ? undefined : index.valueObjects.get(parsed.name)?.label;
    case "workflow":
      return index.pack.workflow.label;
    case "workflowStage":
    case "workflowStep":
      return index.pack.workflow.stages.find((stage) => stage.codeName === parsed.name)?.label;
    case "workflowType":
    case "workflowPort":
      return parsed.name === null ? undefined : { "es-MX": parsed.name, en: parsed.name };
    case "factory":
    case "repository":
      return undefined;
  }
}
