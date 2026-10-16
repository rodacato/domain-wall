import type { PackIndex } from "../../domain/pack/PackIndex";
import type { FieldType } from "../../domain/pack/schema/FieldType";
import type { Literal } from "../../domain/pack/schema/Literal";
import type { LanguageDescriptor } from "../languages/LanguageDescriptor";
import type {
  AggregateTestPlan,
  PlannedArgument,
  PlannedStep,
  ValueObjectTestPlan,
} from "../test-plan/TestPlan";
import { fill } from "./fill";
import { namingFor, type LanguageNaming } from "./LanguageNaming";
import { asNamedList, referencedNames, uniqueSorted } from "./referencedNames";
import { renderLiteral } from "./renderLiteral";

interface ValueRenderer {
  readonly index: PackIndex;
  readonly descriptor: LanguageDescriptor;
  readonly naming: LanguageNaming;
}

function asRecord(value: Literal): Readonly<Record<string, Literal>> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

/** Code that builds a value of the given type in the test's language, going through smart constructors. */
export function renderValue(renderer: ValueRenderer, type: FieldType, value: Literal): string {
  const { index, descriptor, naming } = renderer;
  const { syntax } = descriptor;
  switch (type.kind) {
    case "primitive":
    case "entity":
      return renderLiteral(syntax, value);
    case "list":
      return fill(syntax.values.list, {
        items: (Array.isArray(value) ? value : [])
          .map((item) => renderValue(renderer, type.of, item))
          .join(", "),
      });
    case "optional":
      return value === null ? syntax.values.absent : renderValue(renderer, type.of, value);
    case "valueObject": {
      const valueObject = index.valueObjects.get(type.ref);
      const typeName = naming.type(type.ref);
      if (valueObject?.kind === "scalar") {
        return fill(syntax.values.scalarValueObject, {
          type: typeName,
          literal: renderLiteral(syntax, value),
        });
      }
      if (valueObject?.kind === "enum") {
        const memberName = typeof value === "string" ? value : "";
        return fill(syntax.values.enumMember, {
          type: typeName,
          member: naming.type(memberName),
          snake: naming.errorCode(memberName),
          constant: naming.constant(memberName),
        });
      }
      const fields = (valueObject?.kind === "record" ? valueObject.fields : []).map((field) =>
        fill(syntax.values.recordField, {
          name: naming.member(field.codeName),
          value: renderValue(renderer, field.type, asRecord(value)[field.codeName] ?? null),
        }),
      );
      return fill(syntax.values.record, { type: typeName, fields: fields.join(", ") });
    }
  }
}

/** Value objects a value of this type is built from, including the fields of record value objects. */
export function valueObjectsUsedBy(
  index: PackIndex,
  type: FieldType,
  seen = new Set<string>(),
): readonly string[] {
  return referencedNames(type).flatMap((name) => {
    const valueObject = index.valueObjects.get(name);
    if (valueObject === undefined || seen.has(name)) return [];
    seen.add(name);
    const nested =
      valueObject.kind === "record"
        ? valueObject.fields.flatMap((field) => valueObjectsUsedBy(index, field.type, seen))
        : [];
    return [name, ...nested];
  });
}

function renderArguments(renderer: ValueRenderer, args: readonly PlannedArgument[]): string {
  return args
    .map((argument) =>
      fill(renderer.descriptor.syntax.values.callArgument, {
        name: renderer.naming.member(argument.name),
        value: renderValue(renderer, argument.type, argument.value),
      }),
    )
    .join(", ");
}

export interface CallView {
  readonly call: string;
}

export interface WalkthroughStepView {
  readonly number: number;
  readonly call: string;
  readonly events: string;
  readonly command: string;
}

export interface AggregateTestsView {
  readonly name: string;
  readonly module: string;
  readonly instance: string;
  readonly valueObjectImports: readonly { readonly name: string; readonly last: boolean }[];
  readonly hasValueObjectImports: boolean;
  readonly start: string;
  readonly walkthrough: readonly WalkthroughStepView[];
  readonly finalStatus: string;
  readonly violations: readonly {
    readonly title: string;
    /** A snake_case, unique test name for languages whose tests are methods. */
    readonly slug: string;
    readonly code: string;
    readonly given: readonly CallView[];
    readonly when: string;
  }[];
  readonly invalidStates: readonly {
    readonly title: string;
    readonly slug: string;
    readonly command: string;
    readonly status: string;
    readonly given: readonly CallView[];
    readonly when: string;
  }[];
}

export function buildAggregateTestsView(
  index: PackIndex,
  descriptor: LanguageDescriptor,
  plan: AggregateTestPlan,
  stateLiteral: (state: string) => string,
): AggregateTestsView {
  const naming = namingFor(descriptor.id);
  const renderer: ValueRenderer = { index, descriptor, naming };
  const instance = "current";
  const callOf = (step: Pick<PlannedStep, "command" | "arguments">): string =>
    `${instance}.${naming.member(step.command)}(${renderArguments(renderer, step.arguments)})`;
  const givenOf = (steps: readonly PlannedStep[]): readonly CallView[] =>
    steps.map((step) => ({ call: callOf(step) }));

  const allArguments = [
    ...plan.start,
    ...plan.walkthrough.flatMap((step) => step.arguments),
    ...plan.violations.flatMap((test) => [
      ...test.given.flatMap((step) => step.arguments),
      ...test.when.arguments,
    ]),
    ...plan.invalidStates.flatMap((test) => [
      ...test.given.flatMap((step) => step.arguments),
      ...test.when.arguments,
    ]),
  ];
  const imported = uniqueSorted(
    allArguments.flatMap((argument) => valueObjectsUsedBy(index, argument.type)),
  );

  return {
    name: naming.type(plan.aggregate),
    module: naming.module(plan.aggregate),
    instance: naming.member(plan.aggregate),
    valueObjectImports: asNamedList(imported.map(naming.type)),
    hasValueObjectImports: imported.length > 0,
    start: renderArguments(renderer, plan.start),
    walkthrough: plan.walkthrough.map((step, position) => ({
      number: position + 1,
      call: callOf(step),
      events: step.events.map((event) => `"${event}"`).join(", "),
      command: step.command,
    })),
    finalStatus: stateLiteral(plan.finalState),
    violations: plan.violations.map((test, position) => ({
      title: `rejects ${test.when.command} with ${test.rule}`,
      slug: `rejects_${naming.snake(test.when.command)}_with_${naming.snake(test.rule)}_${position + 1}`,
      code: naming.errorCode(test.rule),
      given: givenOf(test.given),
      when: callOf(test.when),
    })),
    invalidStates: plan.invalidStates.map((test, position) => ({
      title: `rejects ${test.when.command} while ${test.state}`,
      slug: `rejects_${naming.snake(test.when.command)}_while_${naming.snake(test.state)}_${position + 1}`,
      command: test.when.command,
      status: stateLiteral(test.state),
      given: givenOf(test.given),
      when: callOf(test.when),
    })),
  };
}

export interface ValueObjectTestsView {
  readonly imports: readonly { readonly name: string; readonly last: boolean }[];
  readonly scalars: readonly {
    readonly name: string;
    readonly slug: string;
    readonly valid: readonly { readonly literal: string }[];
    readonly invalid: readonly {
      readonly literal: string;
      readonly code: string;
      readonly number: number;
    }[];
  }[];
}

export function buildValueObjectTestsView(
  descriptor: LanguageDescriptor,
  plans: readonly ValueObjectTestPlan[],
): ValueObjectTestsView {
  const naming = namingFor(descriptor.id);
  const { syntax } = descriptor;
  return {
    imports: asNamedList(plans.map((plan) => naming.type(plan.valueObject))),
    scalars: plans.map((plan) => ({
      name: naming.type(plan.valueObject),
      slug: naming.snake(plan.valueObject),
      valid: plan.valid.map((value) => ({ literal: renderLiteral(syntax, value) })),
      invalid: plan.constraints
        .flatMap((constraint) =>
          constraint.invalidExamples.map((value) => ({
            literal: renderLiteral(syntax, value),
            code: naming.errorCode(constraint.constraintCode),
          })),
        )
        .map((example, position) => ({ ...example, number: position + 1 })),
    })),
  };
}
