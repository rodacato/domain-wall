import type { ExerciseKind } from "../course/Syllabus";
import type { LocalizedText } from "../locale/LocalizedText";
import { heroAggregate } from "../pack/heroAggregate";
import type { PackIndex } from "../pack/PackIndex";
import { ANEMIC_PLACES } from "../wall/changeImpact";
import type { Challenge, Exercise, ExerciseItem, ExerciseText } from "./Exercise";
import { shuffledOtherwise } from "./shuffle";

const ui = (key: string): ExerciseText => ({ kind: "ui", key });
const labeled = (id: string, text: LocalizedText): ExerciseItem => ({
  id,
  label: { kind: "pack", text },
});
const keyed = (id: string, key: string): ExerciseItem => ({ id, label: ui(key) });

const MAXIMUM_ITEMS = 6;
const JARGON = ["dto", "foreignKey", "controller", "jsonPayload"] as const;

function locateTheRule(index: PackIndex): Challenge | undefined {
  const aggregate = heroAggregate(index);
  if (aggregate === undefined) return undefined;
  const items = aggregate.rules.slice(0, 3).map((rule) => labeled(rule.codeName, rule.label));
  const places = ANEMIC_PLACES.map((place) => keyed(place, `ui.impact.place.${place}`));
  const home = labeled("aggregate", aggregate.label);
  return {
    type: "classify",
    items,
    groups: [...places, home],
    solution: Object.fromEntries(items.map((item) => [item.id, home.id])),
    reasons: Object.fromEntries(
      items.map((item) => [item.id, ui("ui.exercise.reason.locateTheRule")]),
    ),
  };
}

function classifyPhrases(index: PackIndex): Challenge | undefined {
  const aggregate = heroAggregate(index);
  const event = index.pack.events[0];
  const command = index.pack.commands[0];
  const actor = index.pack.actors[0];
  if (
    aggregate === undefined ||
    event === undefined ||
    command === undefined ||
    actor === undefined
  ) {
    return undefined;
  }
  const business = [
    labeled(aggregate.codeName, aggregate.label),
    labeled(event.codeName, event.label),
    labeled(command.codeName, command.label),
    labeled(actor.codeName, actor.label),
  ];
  const technical = JARGON.map((term) => keyed(term, `ui.exercise.jargon.${term}`));
  const items = [...business, ...technical];
  return {
    type: "classify",
    items,
    groups: [
      keyed("business", "ui.exercise.group.business"),
      keyed("technical", "ui.exercise.group.technical"),
    ],
    solution: Object.fromEntries([
      ...business.map((item) => [item.id, "business"] as const),
      ...technical.map((item) => [item.id, "technical"] as const),
    ]),
    reasons: Object.fromEntries([
      ...business.map((item) => [item.id, ui("ui.exercise.reason.business")] as const),
      ...technical.map((item) => [item.id, ui("ui.exercise.reason.technical")] as const),
    ]),
  };
}

function orderEvents(index: PackIndex): Challenge | undefined {
  const aggregate = heroAggregate(index);
  if (aggregate === undefined) return undefined;
  const emitted = new Set(aggregate.transitions.flatMap((transition) => transition.emits));
  const events = index.pack.events
    .filter((event) => emitted.has(event.codeName))
    .sort((a, b) => a.sequence - b.sequence)
    .slice(0, MAXIMUM_ITEMS);
  if (events.length < 3) return undefined;
  const items = events.map((event) => labeled(event.codeName, event.label));
  return {
    type: "order",
    items: shuffledOtherwise(items, `${index.pack.meta.packId}:orderEvents`),
    solution: items.map((item) => item.id),
  };
}

function assignNotesToContexts(index: PackIndex): Challenge | undefined {
  const candidates = [
    ...index.pack.aggregates.map((aggregate) => ({
      item: labeled(aggregate.codeName, aggregate.label),
      context: aggregate.context,
    })),
    ...index.pack.commands.map((command) => ({
      item: labeled(command.codeName, command.label),
      context: command.context,
    })),
  ];
  const perContext = new Map<string, number>();
  const picked = candidates
    .filter((candidate) => {
      const count = perContext.get(candidate.context) ?? 0;
      perContext.set(candidate.context, count + 1);
      return count < 2;
    })
    .slice(0, MAXIMUM_ITEMS);
  const contexts = index.pack.contexts;
  if (picked.length < 3 || contexts.length < 2) return undefined;
  const descriptionOf = new Map(
    contexts.map((context) => [context.codeName, context.description] as const),
  );
  return {
    type: "classify",
    items: shuffledOtherwise(
      picked.map((entry) => entry.item),
      `${index.pack.meta.packId}:assign`,
    ),
    groups: contexts.map((context) => labeled(context.codeName, context.label)),
    solution: Object.fromEntries(picked.map((entry) => [entry.item.id, entry.context])),
    reasons: Object.fromEntries(
      picked.flatMap((entry) => {
        const description = descriptionOf.get(entry.context);
        return description === undefined
          ? []
          : [[entry.item.id, { kind: "pack", text: description } as const]];
      }),
    ),
  };
}

function classifyAntiCorruption(index: PackIndex): Challenge | undefined {
  const { translation, externalTypes } = index.pack.antiCorruptionLayer;
  const fieldLabel = (name: string): ExerciseItem["label"] | undefined => {
    for (const type of externalTypes) {
      const field = type.fields.find((candidate) => candidate.codeName === name);
      if (field !== undefined) return { kind: "pack", text: field.label };
    }
    return undefined;
  };
  const items = translation.slice(0, MAXIMUM_ITEMS).flatMap((mapping) => {
    const label = fieldLabel(mapping.externalField);
    return label === undefined ? [] : [{ id: mapping.externalField, label, op: mapping.op }];
  });
  if (items.length < 3) return undefined;
  const ops = ["rename", "format", "mapCode", "constant"] as const;
  return {
    type: "classify",
    items: shuffledOtherwise(
      items.map(({ id, label }) => ({ id, label })),
      `${index.pack.meta.packId}:acl`,
    ),
    groups: ops.map((op) => keyed(op, `ui.exercise.acl.${op}`)),
    solution: Object.fromEntries(items.map((item) => [item.id, item.op])),
    reasons: Object.fromEntries(
      items.map((item) => [item.id, ui(`ui.exercise.reason.acl.${item.op}`)]),
    ),
  };
}

function classifySubdomains(index: PackIndex): Challenge | undefined {
  const contexts = index.pack.contexts;
  if (contexts.length < 3) return undefined;
  const items = contexts.map((context) => labeled(context.codeName, context.label));
  return {
    type: "classify",
    items: shuffledOtherwise(items, `${index.pack.meta.packId}:subdomains`),
    groups: (["core", "supporting", "generic"] as const).map((zone) =>
      keyed(zone, `ui.zone.${zone}.title`),
    ),
    solution: Object.fromEntries(
      contexts.map((context) => [context.codeName, context.subdomain.type]),
    ),
    reasons: Object.fromEntries(
      contexts.map((context) => [
        context.codeName,
        { kind: "pack", text: context.subdomain.rationale } as const,
      ]),
    ),
  };
}

/** The exercise of a kind that needs no code, derived from the pack; undefined when the kind needs code or the pack is too small. */
export function deriveExercise(index: PackIndex, kind: ExerciseKind): Exercise | undefined {
  const challenge = (() => {
    switch (kind) {
      case "locateTheRule":
        return locateTheRule(index);
      case "classifyPhrases":
        return classifyPhrases(index);
      case "orderEvents":
        return orderEvents(index);
      case "assignNotesToContexts":
        return assignNotesToContexts(index);
      case "implementAntiCorruptionLayer":
        return classifyAntiCorruption(index);
      case "classifySubdomains":
        return classifySubdomains(index);
      case "implementTheRule":
      case "addPipelineStage":
      case "implementRepositoryAdapter":
      case "implementTheChange":
        return undefined;
    }
  })();
  return challenge === undefined ? undefined : { kind, challenge };
}
