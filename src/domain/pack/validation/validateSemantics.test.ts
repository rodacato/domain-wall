import { describe, expect, it } from "vitest";
import { loadDefaultPack, mutablePack, required } from "../packFixtures";
import type { SchemaValidPack } from "../parseDomainPack";
import type { DomainPack } from "../schema/DomainPack";
import { validateSemantics } from "./validateSemantics";

function ruleIdsReportedFor(mutate: (pack: DomainPack) => void): ReadonlySet<string> {
  const pack = mutablePack();
  mutate(pack);
  const outcome = validateSemantics(pack as SchemaValidPack);
  return new Set(outcome.ok ? [] : outcome.error.map((issue) => issue.ruleId));
}

function setText(text: object, locale: string, value: string): void {
  (text as Record<string, string>)[locale] = value;
}

/** A value object nothing refers to, under the given name. */
function unusedValueObjectNamed(
  pack: DomainPack,
  codeName: string,
): DomainPack["valueObjects"][number] {
  const template = required(
    pack.valueObjects.find((vo) => vo.kind === "enum"),
    "an enum value object",
  );
  const copy = structuredClone(template);
  copy.codeName = codeName as never;
  return copy;
}

const orderAggregate = (pack: DomainPack) =>
  required(
    pack.aggregates.find((a) => a.codeName === "Order"),
    "Order",
  );
const ruleOf = (pack: DomainPack, name: string) =>
  required(
    orderAggregate(pack).rules.find((rule) => rule.codeName === name),
    name,
  );

describe("the default pack", () => {
  it("passes every semantic rule", () => {
    const outcome = validateSemantics(loadDefaultPack());

    expect(outcome.ok ? [] : outcome.error).toEqual([]);
  });
});

/** Each case breaks exactly one thing and expects the matching rule to notice. */
const brokenPacks: readonly {
  readonly ruleId: string;
  readonly breakage: string;
  readonly mutate: (pack: DomainPack) => void;
}[] = [
  {
    ruleId: "S01",
    breakage: "a command is handled by an aggregate that does not exist",
    mutate: (pack) => {
      required(pack.commands[0], "a command").handledBy = "Nobody" as never;
    },
  },
  {
    ruleId: "S01",
    breakage: "a transition guard names a rule that does not exist",
    mutate: (pack) => {
      required(orderAggregate(pack).transitions[2], "a transition").guards.push(
        "GhostRule" as never,
      );
    },
  },
  {
    ruleId: "S02",
    breakage: "a rule whose predicate always holds can never be violated",
    mutate: (pack) => {
      ruleOf(pack, "OrderMustHaveLines").predicate = {
        kind: "compare",
        left: { op: "literal", value: 1 },
        operator: "==",
        right: { op: "literal", value: 1 },
      };
    },
  },
  {
    ruleId: "S02",
    breakage: "a rule is not used by any transition or invariant",
    mutate: (pack) => {
      const rule = structuredClone(ruleOf(pack, "OrderMustHaveLines"));
      rule.codeName = "OrphanRule" as never;
      orderAggregate(pack).rules.push(rule);
    },
  },
  {
    ruleId: "S03",
    breakage: "a state cannot be reached",
    mutate: (pack) => {
      const state = structuredClone(required(orderAggregate(pack).states[0], "a state"));
      state.codeName = "Limbo" as never;
      orderAggregate(pack).states.push(state);
    },
  },
  {
    ruleId: "S03",
    breakage: "a non-terminal state is a dead end",
    mutate: (pack) => {
      const delivered = required(
        orderAggregate(pack).states.find((s) => s.codeName === "Delivered"),
        "Delivered",
      );
      delivered.terminal = false;
    },
  },
  {
    ruleId: "S04",
    breakage: "a value object is not used anywhere",
    mutate: (pack) => {
      pack.valueObjects.push(unusedValueObjectNamed(pack, "UnusedThing"));
    },
  },
  {
    ruleId: "S05",
    breakage: "the ambiguous term appears in one context only",
    mutate: (pack) => {
      pack.ambiguousTerm.meanings = pack.ambiguousTerm.meanings.slice(0, 1);
    },
  },
  {
    ruleId: "S06",
    breakage: "two concepts share a code name",
    mutate: (pack) => {
      required(pack.events[0], "an event").codeName = "Order" as never;
    },
  },
  {
    ruleId: "S07",
    breakage: "a field is named like a reserved word",
    mutate: (pack) => {
      required(orderAggregate(pack).fields[1], "a field").codeName = "class" as never;
    },
  },
  {
    ruleId: "S07",
    breakage: "a derived companion type collides with a declared name",
    mutate: (pack) => {
      pack.valueObjects.push(unusedValueObjectNamed(pack, "OrderError"));
    },
  },
  {
    ruleId: "S08",
    breakage: "a label is an unfinished placeholder",
    mutate: (pack) => {
      setText(required(pack.events[0], "an event").label, "en", "TODO");
    },
  },
  {
    ruleId: "S08",
    breakage: "the pack does not declare every supported locale",
    mutate: (pack) => {
      pack.meta.locales = ["en"];
    },
  },
  {
    ruleId: "S09",
    breakage: "a policy triggers a command that says another policy issues it",
    mutate: (pack) => {
      required(pack.policies[0], "a policy").then = "MarkOrderDelivered" as never;
    },
  },
  {
    ruleId: "S10",
    breakage: "the context map has a single relation",
    mutate: (pack) => {
      pack.contextRelations = pack.contextRelations.slice(0, 1);
    },
  },
  {
    ruleId: "S11",
    breakage: "an external field is never filled",
    mutate: (pack) => {
      pack.antiCorruptionLayer.translation = pack.antiCorruptionLayer.translation.slice(1);
    },
  },
  {
    ruleId: "S12",
    breakage: "a stage outputs a type the next stage does not expect",
    mutate: (pack) => {
      required(pack.workflow.stages[0], "a stage").output = "PricedCheckout" as never;
    },
  },
  {
    ruleId: "S13",
    breakage: "a valid example breaks a constraint",
    mutate: (pack) => {
      const quantity = required(
        pack.valueObjects.find((vo) => vo.codeName === "Quantity"),
        "Quantity",
      );
      if (quantity.kind === "scalar") quantity.examples.valid = [0];
    },
  },
  {
    ruleId: "S14",
    breakage: "no context is a core subdomain",
    mutate: (pack) => {
      for (const context of pack.contexts) context.subdomain.type = "supporting";
    },
  },
  {
    ruleId: "S15",
    breakage: "a dialogue refers to a term that does not exist",
    mutate: (pack) => {
      const line = required(pack.dialogues["ubiquity.intro"][1], "a dialogue line");
      setText(line.text, "en", "Look at the {{term:NoSuchThing}}.");
      setText(line.text, "es-MX", "Mira el {{term:NoSuchThing}}.");
    },
  },
  {
    ruleId: "S16",
    breakage: "a label is too long for a sticky note",
    mutate: (pack) => {
      setText(required(pack.events[0], "an event").label, "en", "x".repeat(80));
    },
  },
  {
    ruleId: "S17",
    breakage: "the evolution change leaves the old walkthrough behind",
    mutate: (pack) => {
      pack.changeScenarios.evolution.patch = pack.changeScenarios.evolution.patch.filter(
        (operation) => operation.op !== "replaceWalkthrough",
      );
    },
  },
  {
    ruleId: "S18",
    breakage: "a walkthrough stops before a terminal state",
    mutate: (pack) => {
      orderAggregate(pack).walkthrough = orderAggregate(pack).walkthrough.slice(0, 3);
    },
  },
  {
    ruleId: "S19",
    breakage: "a pattern uses a lookahead",
    mutate: (pack) => {
      const postalCode = required(
        pack.valueObjects.find((vo) => vo.codeName === "PostalCode"),
        "PostalCode",
      );
      const constraint = postalCode.kind === "scalar" ? postalCode.constraints[0] : undefined;
      if (constraint?.kind === "pattern") constraint.value = "(?=[0-9])[0-9]{5}";
    },
  },
  {
    ruleId: "S21",
    breakage: "a guard reads an argument the command does not have",
    mutate: (pack) => {
      ruleOf(pack, "PaymentMustMatchTotal").predicate = {
        kind: "compare",
        left: { op: "arg", name: "nothing" as never },
        operator: "==",
        right: { op: "field", name: "total" as never },
      };
    },
  },
];

describe("semantic rules notice what is broken", () => {
  it.each(brokenPacks)("$ruleId: $breakage", ({ ruleId, mutate }) => {
    expect(ruleIdsReportedFor(mutate).has(ruleId)).toBe(true);
  });
});
