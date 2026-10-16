import type { PackIndex } from "../../domain/pack/PackIndex";
import { resolvePayloadSource } from "../../domain/pack/eventPayload";
import { renderName, splitIntoWords } from "../../domain/pack/naming/NameStyle";
import type {
  Aggregate,
  DerivedField,
  Entity,
  Transition,
} from "../../domain/pack/schema/Aggregate";
import type { Command } from "../../domain/pack/schema/EventStorming";
import type { Expression } from "../../domain/pack/schema/Expression";
import type { FieldType } from "../../domain/pack/schema/FieldType";
import type { CodeName } from "../../domain/pack/naming/CodeName";
import type { LanguageDescriptor } from "../languages/LanguageDescriptor";
import { fill } from "./fill";
import { namingFor, type LanguageNaming } from "./LanguageNaming";
import { asNamedList, referencedNames, uniqueSorted, withLast } from "./referencedNames";
import { renderExpression, renderTypedValue, type ExpressionContext } from "./renderExpression";
import { renderFieldType } from "./renderFieldType";
import { renderFailure } from "./renderPredicate";

interface Named {
  readonly name: string;
  readonly type: string;
  readonly last: boolean;
}

export interface GuardView {
  readonly anchor: string;
  readonly failure: string;
  readonly code: string;
  readonly ruleName: string;
}

export interface EmittedEventView {
  readonly type: string;
  readonly discriminator: string;
  readonly fields: readonly {
    readonly name: string;
    readonly value: string;
    readonly last: boolean;
  }[];
  readonly hasFields: boolean;
}

export interface BranchView {
  readonly anchor: string;
  readonly fromList: string;
  readonly singleFrom: boolean;
  readonly onlyFrom: string;
  readonly guards: readonly GuardView[];
  readonly changes: readonly {
    readonly field: string;
    readonly value: string;
    readonly last: boolean;
  }[];
  readonly events: readonly EmittedEventView[];
  readonly hasGuards: boolean;
}

export interface CommandView {
  readonly method: string;
  readonly anchor: string;
  readonly commandName: string;
  readonly params: readonly Named[];
  readonly hasParams: boolean;
  readonly branches: readonly BranchView[];
  readonly singleBranch: boolean;
  readonly onlyBranch: BranchView | undefined;
}

export interface EntityView {
  readonly name: string;
  readonly anchor: string;
  readonly fields: readonly Named[];
  readonly derived: readonly {
    readonly name: string;
    readonly type: string;
    readonly expression: string;
  }[];
}

export interface AggregateView {
  readonly name: string;
  readonly module: string;
  readonly anchor: string;
  readonly statusType: string;
  readonly errorType: string;
  readonly eventType: string;
  readonly outcomeType: string;
  readonly repositoryType: string;
  readonly identityName: string;
  readonly identityType: string;
  readonly instance: string;
  readonly initialStatus: string;
  readonly valueObjectImports: readonly { readonly name: string; readonly last: boolean }[];
  readonly hasValueObjectImports: boolean;
  readonly eventImports: readonly { readonly name: string; readonly last: boolean }[];
  readonly states: readonly {
    readonly name: string;
    readonly literal: string;
    readonly anchor: string;
    readonly last: boolean;
  }[];
  readonly errors: readonly { readonly code: string }[];
  readonly events: readonly { readonly type: string; readonly last: boolean }[];
  readonly entities: readonly EntityView[];
  readonly stateFields: readonly {
    readonly name: string;
    readonly type: string;
    readonly initial: string;
    readonly last: boolean;
  }[];
  readonly startParams: readonly Named[];
  readonly derived: readonly {
    readonly name: string;
    readonly type: string;
    readonly expression: string;
  }[];
  readonly commands: readonly CommandView[];
  readonly invariants: readonly GuardView[];
  readonly hasInvariants: boolean;
}

function isScalarValueObject(
  index: PackIndex,
  type: FieldType,
): type is Extract<FieldType, { kind: "valueObject" }> {
  return type.kind === "valueObject" && index.valueObjects.get(type.ref)?.kind === "scalar";
}

export function stateLiteral(
  descriptor: LanguageDescriptor,
  naming: LanguageNaming,
  aggregate: Aggregate,
  stateName: string,
): string {
  const words = splitIntoWords(stateName as CodeName);
  return fill(descriptor.syntax.stateLiteral, {
    name: stateName,
    snake: renderName(words, "snake_case"),
    constant: renderName(words, "SCREAMING_SNAKE_CASE"),
    aggregate: naming.type(aggregate.codeName),
  });
}

function withTrusted(
  index: PackIndex,
  descriptor: LanguageDescriptor,
  naming: LanguageNaming,
  type: FieldType,
  expression: string,
): string {
  if (!isScalarValueObject(index, type)) return expression;
  return fill(descriptor.syntax.expressions.trusted, {
    type: naming.type(type.ref),
    value: expression,
  });
}

function derivedView(
  context: ExpressionContext,
  descriptor: LanguageDescriptor,
  derived: DerivedField,
): { name: string; type: string; expression: string } {
  const { naming, index } = context;
  return {
    name: naming.member(derived.codeName),
    type: renderFieldType(index, descriptor.syntax, naming, derived.type),
    expression: withTrusted(
      index,
      descriptor,
      naming,
      derived.type,
      renderExpression(context, derived.expression),
    ),
  };
}

function entityView(
  index: PackIndex,
  descriptor: LanguageDescriptor,
  aggregate: Aggregate,
  entity: Entity,
): EntityView {
  const naming = namingFor(descriptor.id);
  const context: ExpressionContext = {
    index,
    aggregate,
    syntax: descriptor.syntax,
    naming,
    scope: { kind: "entity", entity },
    self: "current",
    command: null,
  };
  return {
    name: naming.type(entity.codeName),
    anchor: `${aggregate.codeName}.entity.${entity.codeName}`,
    fields: withLast(
      entity.fields.map((field) => ({
        name: naming.member(field.codeName),
        type: renderFieldType(index, descriptor.syntax, naming, field.type),
      })),
    ),
    derived: entity.derived.map((derived) => derivedView(context, descriptor, derived)),
  };
}

function eventPayloadValue(
  context: ExpressionContext,
  aggregate: Aggregate,
  command: Command,
  fieldName: string,
  payloadType: FieldType,
): string {
  const source = resolvePayloadSource(aggregate, command, fieldName);
  const reference: Expression =
    source?.kind === "argument"
      ? { op: "arg", name: fieldName as never }
      : { op: "field", name: fieldName as never };
  return renderTypedValue(context, reference, payloadType);
}

function storedTypeOfField(aggregate: Aggregate, fieldName: string): FieldType | undefined {
  const stored = aggregate.fields.find((field) => field.codeName === fieldName);
  if (stored !== undefined) return stored.type;
  const stateData = aggregate.states
    .flatMap((state) => state.data)
    .find((field) => field.codeName === fieldName);
  return stateData === undefined ? undefined : { kind: "optional", of: stateData.type };
}

function branchView(
  index: PackIndex,
  descriptor: LanguageDescriptor,
  aggregate: Aggregate,
  command: Command,
  transition: Transition,
  position: number,
  total: number,
): BranchView {
  const naming = namingFor(descriptor.id);
  const base = {
    index,
    aggregate,
    syntax: descriptor.syntax,
    naming,
    scope: { kind: "aggregate" } as const,
    command,
  };
  const before: ExpressionContext = { ...base, self: "current" };
  const after: ExpressionContext = { ...base, self: "next" };
  const literal = (state: string): string => stateLiteral(descriptor, naming, aggregate, state);

  const guards = transition.guards.flatMap((ruleName) => {
    const rule = aggregate.rules.find((candidate) => candidate.codeName === ruleName);
    if (rule === undefined) return [];
    return [
      {
        anchor: `${aggregate.codeName}.rule.${rule.codeName}`,
        failure: renderFailure(before, rule.predicate),
        code: naming.errorCode(rule.codeName),
        ruleName: rule.codeName,
      },
    ];
  });

  const effectChanges = transition.effects.map((effect) => {
    const targetType = storedTypeOfField(aggregate, effect.field) ?? {
      kind: "primitive",
      name: "string" as const,
    };
    const elementType = targetType.kind === "list" ? targetType.of : targetType;
    const value = renderTypedValue(
      before,
      effect.value,
      effect.op === "append" ? elementType : targetType,
    );
    const field = naming.member(effect.field);
    if (effect.op === "set") return { field, value };
    const current = renderExpression(before, { op: "field", name: effect.field });
    return { field, value: fill(descriptor.syntax.expressions.append, { current, value }) };
  });
  const changes = withLast([{ field: "status", value: literal(transition.to) }, ...effectChanges]);

  const events = transition.emits.flatMap((eventName) => {
    const event = index.events.get(eventName);
    if (event === undefined) return [];
    const fields = event.payload.map((field) => ({
      name: naming.member(field.codeName),
      value: eventPayloadValue(after, aggregate, command, field.codeName, field.type),
    }));
    return [
      {
        type: naming.type(event.codeName),
        discriminator: event.codeName,
        fields: withLast(fields),
        hasFields: fields.length > 0,
      },
    ];
  });

  return {
    anchor:
      total === 1
        ? `${aggregate.codeName}.transition.${command.codeName}`
        : `${aggregate.codeName}.transition.${command.codeName}.${position + 1}`,
    fromList: transition.from.map(literal).join(", "),
    singleFrom: transition.from.length === 1,
    onlyFrom: literal(transition.from[0] ?? ""),
    guards,
    changes,
    events,
    hasGuards: guards.length > 0,
  };
}

function commandView(
  index: PackIndex,
  descriptor: LanguageDescriptor,
  aggregate: Aggregate,
  command: Command,
): CommandView {
  const naming = namingFor(descriptor.id);
  const transitions = aggregate.transitions.filter(
    (transition) => transition.command === command.codeName,
  );
  const branches = transitions.map((transition, position) =>
    branchView(index, descriptor, aggregate, command, transition, position, transitions.length),
  );
  return {
    method: naming.member(command.codeName),
    anchor: `${aggregate.codeName}.command.${command.codeName}`,
    commandName: command.codeName,
    params: withLast(
      command.params.map((param) => ({
        name: naming.member(param.codeName),
        type: renderFieldType(index, descriptor.syntax, naming, param.type),
      })),
    ),
    hasParams: command.params.length > 0,
    branches,
    singleBranch: branches.length === 1,
    onlyBranch: branches.length === 1 ? branches[0] : undefined,
  };
}

function initialValueOf(
  descriptor: LanguageDescriptor,
  type: FieldType,
  paramName: string,
): string {
  if (type.kind === "list") return descriptor.syntax.literals.emptyList;
  if (type.kind === "optional") return descriptor.syntax.literals.null;
  return paramName;
}

export function buildAggregateView(
  index: PackIndex,
  descriptor: LanguageDescriptor,
  aggregate: Aggregate,
): AggregateView {
  const naming = namingFor(descriptor.id);
  const type = (fieldType: FieldType): string =>
    renderFieldType(index, descriptor.syntax, naming, fieldType);
  const name = naming.type(aggregate.codeName);
  const identityField = aggregate.fields.find((field) => field.codeName === aggregate.identity);
  const context: ExpressionContext = {
    index,
    aggregate,
    syntax: descriptor.syntax,
    naming,
    scope: { kind: "aggregate" },
    self: "current",
    command: null,
  };
  const afterContext: ExpressionContext = { ...context, self: "next" };

  const commands = index.pack.commands.filter(
    (command) => command.handledBy === aggregate.codeName,
  );
  const stateData = aggregate.states.flatMap((state) => state.data);
  const startFields = aggregate.fields.filter(
    (field) => field.type.kind !== "list" && field.type.kind !== "optional",
  );

  const emittedNames = uniqueSorted(
    aggregate.transitions.flatMap((transition) => transition.emits),
  );
  const ruleCodes = [
    ...new Set([
      ...aggregate.transitions.flatMap((transition) => transition.guards),
      ...aggregate.invariants,
    ]),
  ];

  const valueObjectNames = [
    ...aggregate.fields.flatMap((field) => referencedNames(field.type)),
    ...stateData.flatMap((field) => referencedNames(field.type)),
    ...aggregate.derived.flatMap((derived) => referencedNames(derived.type)),
    ...aggregate.entities.flatMap((entity) =>
      [...entity.fields, ...entity.derived].flatMap((field) => referencedNames(field.type)),
    ),
    ...commands.flatMap((command) =>
      command.params.flatMap((param) => referencedNames(param.type)),
    ),
  ].filter((candidate) => index.valueObjects.has(candidate));

  const storedFields = [
    ...aggregate.fields.map((field) => ({
      name: naming.member(field.codeName),
      type: type(field.type),
      initial: initialValueOf(descriptor, field.type, naming.member(field.codeName)),
    })),
    ...stateData.map((field) => ({
      name: naming.member(field.codeName),
      type: type({ kind: "optional", of: field.type }),
      initial: descriptor.syntax.literals.null,
    })),
  ];

  return {
    name,
    module: naming.module(aggregate.codeName),
    anchor: aggregate.codeName,
    statusType: `${name}Status`,
    errorType: `${name}Error`,
    eventType: `${name}Event`,
    outcomeType: `${name}Outcome`,
    repositoryType: `${name}Repository`,
    identityName: naming.member(aggregate.identity),
    identityType: identityField === undefined ? "" : type(identityField.type),
    instance: naming.member(aggregate.codeName),
    initialStatus: stateLiteral(descriptor, naming, aggregate, aggregate.initialState),
    valueObjectImports: asNamedList(uniqueSorted(valueObjectNames).map(naming.type)),
    hasValueObjectImports: valueObjectNames.length > 0,
    eventImports: asNamedList(emittedNames.map(naming.type)),
    states: withLast(
      aggregate.states.map((state) => ({
        name: naming.type(state.codeName),
        literal: stateLiteral(descriptor, naming, aggregate, state.codeName),
        anchor: `${aggregate.codeName}.state.${state.codeName}`,
      })),
    ),
    errors: ruleCodes.map((code) => ({ code: naming.errorCode(code) })),
    events: withLast(emittedNames.map((eventName) => ({ type: naming.type(eventName) }))),
    entities: aggregate.entities.map((entity) => entityView(index, descriptor, aggregate, entity)),
    stateFields: withLast(storedFields),
    startParams: withLast(
      startFields.map((field) => ({ name: naming.member(field.codeName), type: type(field.type) })),
    ),
    derived: aggregate.derived.map((derived) => derivedView(context, descriptor, derived)),
    commands: commands.map((command) => commandView(index, descriptor, aggregate, command)),
    invariants: aggregate.invariants.flatMap((ruleName) => {
      const rule = aggregate.rules.find((candidate) => candidate.codeName === ruleName);
      if (rule === undefined) return [];
      return [
        {
          anchor: `${aggregate.codeName}.invariant.${rule.codeName}`,
          failure: renderFailure(afterContext, rule.predicate),
          code: naming.errorCode(rule.codeName),
          ruleName: rule.codeName,
        },
      ];
    }),
    hasInvariants: aggregate.invariants.length > 0,
  };
}
