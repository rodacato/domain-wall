import type { PackIndex } from "../../domain/pack/PackIndex";
import type { Constraint, ScalarValueObject } from "../../domain/pack/schema/ValueObject";
import type { LanguageDescriptor } from "../languages/LanguageDescriptor";
import { fill } from "./fill";
import { namingFor } from "./LanguageNaming";
import { renderFieldType } from "./renderFieldType";
import { renderString } from "./renderLiteral";
import { withLast } from "./referencedNames";

export interface ScalarView {
  readonly name: string;
  readonly anchor: string;
  readonly baseType: string;
  readonly isString: boolean;
  readonly constraintCount: number;
  readonly errors: readonly { readonly code: string; readonly last: boolean }[];
  readonly violations: readonly { readonly code: string; readonly condition: string }[];
  readonly brand: string;
  readonly constant: string;
}

export interface EnumView {
  readonly name: string;
  readonly anchor: string;
  readonly members: readonly {
    readonly name: string;
    readonly snake: string;
    readonly constant: string;
    readonly last: boolean;
  }[];
}

export interface RecordView {
  readonly name: string;
  readonly anchor: string;
  readonly fields: readonly {
    readonly name: string;
    readonly type: string;
    readonly last: boolean;
  }[];
}

export interface ValueObjectsView {
  readonly scalars: readonly ScalarView[];
  readonly enums: readonly EnumView[];
  readonly records: readonly RecordView[];
}

function violationCondition(descriptor: LanguageDescriptor, constraint: Constraint): string {
  const { constraints } = descriptor.syntax;
  switch (constraint.kind) {
    case "minLength":
      return fill(constraints.minLength, { value: "value", limit: String(constraint.value) });
    case "maxLength":
      return fill(constraints.maxLength, { value: "value", limit: String(constraint.value) });
    case "min":
      return fill(constraints.min, { value: "value", limit: String(constraint.value) });
    case "max":
      return fill(constraints.max, { value: "value", limit: String(constraint.value) });
    case "pattern":
      return fill(constraints.pattern, {
        value: "value",
        pattern: renderString(descriptor.syntax, constraint.value),
        anchored: renderString(descriptor.syntax, `^(?:${constraint.value})$`),
      });
  }
}

function scalarView(descriptor: LanguageDescriptor, valueObject: ScalarValueObject): ScalarView {
  const naming = namingFor(descriptor.id);
  const name = naming.type(valueObject.codeName);
  return {
    name,
    anchor: `valueObject.${valueObject.codeName}`,
    baseType:
      valueObject.base === "string"
        ? descriptor.syntax.types.string
        : descriptor.syntax.types.integer,
    isString: valueObject.base === "string",
    constraintCount: valueObject.constraints.length,
    errors: withLast(
      valueObject.constraints.map((constraint) => ({
        code: naming.errorCode(constraint.errorCode),
      })),
    ),
    violations: valueObject.constraints.map((constraint) => ({
      code: naming.errorCode(constraint.errorCode),
      condition: violationCondition(descriptor, constraint),
    })),
    brand: `${naming.member(valueObject.codeName)}Brand`,
    constant: naming.module(valueObject.codeName).toUpperCase().replaceAll("-", "_"),
  };
}

export function buildValueObjectsView(
  index: PackIndex,
  descriptor: LanguageDescriptor,
): ValueObjectsView {
  const naming = namingFor(descriptor.id);
  const scalars: ScalarView[] = [];
  const enums: EnumView[] = [];
  const records: RecordView[] = [];

  for (const valueObject of index.pack.valueObjects) {
    switch (valueObject.kind) {
      case "scalar":
        scalars.push(scalarView(descriptor, valueObject));
        break;
      case "enum":
        enums.push({
          name: naming.type(valueObject.codeName),
          anchor: `valueObject.${valueObject.codeName}`,
          members: withLast(
            valueObject.members.map((member) => ({
              name: naming.type(member.codeName),
              snake: naming.errorCode(member.codeName),
              constant: naming.module(member.codeName).toUpperCase().replaceAll("-", "_"),
            })),
          ),
        });
        break;
      case "record":
        records.push({
          name: naming.type(valueObject.codeName),
          anchor: `valueObject.${valueObject.codeName}`,
          fields: withLast(
            valueObject.fields.map((field) => ({
              name: naming.member(field.codeName),
              type: renderFieldType(descriptor.syntax, naming, field.type),
            })),
          ),
        });
        break;
    }
  }
  return { scalars, enums, records };
}
