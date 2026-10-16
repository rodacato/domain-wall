import type { PackIndex } from "../../domain/pack/PackIndex";
import type { Aggregate } from "../../domain/pack/schema/Aggregate";
import type { LanguageDescriptor } from "../languages/LanguageDescriptor";
import type { AggregateTestPlan } from "../test-plan/TestPlan";
import { buildAggregateTestsView } from "./buildTestViews";
import { fill } from "./fill";
import { namingFor } from "./LanguageNaming";
import { renderFieldType } from "./renderFieldType";
import { renderLiteral } from "./renderLiteral";

export interface AdapterView {
  readonly name: string;
  readonly anchor: string;
  readonly aggregate: string;
  readonly aggregateModule: string;
  readonly repositoryType: string;
  readonly instance: string;
  readonly identityName: string;
  readonly identityType: string;
  readonly valueObjectImports: readonly { readonly name: string; readonly last: boolean }[];
  readonly hasValueObjectImports: boolean;
}

export interface AdapterTestsView extends AdapterView {
  readonly module: string;
  readonly start: string;
  /** An identity no saved aggregate has. */
  readonly unknownIdentity: string;
}

export function adapterNameOf(aggregate: Aggregate): string {
  return `InMemory${aggregate.codeName}Repository`;
}

export function buildAdapterView(
  index: PackIndex,
  descriptor: LanguageDescriptor,
  aggregate: Aggregate,
): AdapterView | undefined {
  const naming = namingFor(descriptor.id);
  const identity = aggregate.fields.find((field) => field.codeName === aggregate.identity);
  if (identity === undefined) return undefined;
  const referenced = identity.type.kind === "valueObject" ? [naming.type(identity.type.ref)] : [];
  return {
    name: adapterNameOf(aggregate),
    anchor: `${aggregate.codeName}.adapter`,
    aggregate: naming.type(aggregate.codeName),
    aggregateModule: descriptor.moduleStem(aggregate.codeName),
    repositoryType: `${naming.type(aggregate.codeName)}Repository`,
    instance: naming.member(aggregate.codeName),
    identityName: naming.member(aggregate.identity),
    identityType: renderFieldType(index, descriptor.syntax, naming, identity.type),
    valueObjectImports: referenced.map((name, position) => ({
      name,
      last: position === referenced.length - 1,
    })),
    hasValueObjectImports: referenced.length > 0,
  };
}

export function buildAdapterTestsView(
  index: PackIndex,
  descriptor: LanguageDescriptor,
  aggregate: Aggregate,
  plan: AggregateTestPlan,
  stateLiteral: (state: string) => string,
): AdapterTestsView | undefined {
  const adapter = buildAdapterView(index, descriptor, aggregate);
  const identity = aggregate.fields.find((field) => field.codeName === aggregate.identity);
  if (adapter === undefined || identity === undefined) return undefined;
  const naming = namingFor(descriptor.id);
  const { syntax } = descriptor;
  const aggregateTests = buildAggregateTestsView(index, descriptor, plan, stateLiteral);

  const valueObject =
    identity.type.kind === "valueObject" ? index.valueObjects.get(identity.type.ref) : undefined;
  const base = valueObject?.kind === "scalar" ? valueObject.base : "string";
  const unknown = renderLiteral(syntax, base === "integer" ? 0 : "unknown-identity");
  const unknownIdentity =
    identity.type.kind === "valueObject"
      ? fill(syntax.expressions.trusted, { type: naming.type(identity.type.ref), value: unknown })
      : unknown;

  const imports = [
    ...aggregateTests.valueObjectImports.map((entry) => entry.name),
    ...adapter.valueObjectImports.map((entry) => entry.name),
  ];
  const unique = [...new Set(imports)].sort();
  return {
    ...adapter,
    module: descriptor.moduleStem(adapter.name),
    start: aggregateTests.start,
    unknownIdentity,
    valueObjectImports: unique.map((name, position) => ({
      name,
      last: position === unique.length - 1,
    })),
    hasValueObjectImports: unique.length > 0,
  };
}
