import type { PackIndex } from "../PackIndex";
import type { FieldType } from "../schema/FieldType";
import type { Constraint, ScalarValueObject } from "../schema/ValueObject";
import type { Rejection } from "./Rejection";
import { isValueRecord, type Value } from "./Value";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

export function satisfiesConstraint(constraint: Constraint, value: string | number): boolean {
  switch (constraint.kind) {
    case "minLength":
      return typeof value === "string" && value.length >= constraint.value;
    case "maxLength":
      return typeof value === "string" && value.length <= constraint.value;
    case "min":
      return typeof value === "number" && value >= constraint.value;
    case "max":
      return typeof value === "number" && value <= constraint.value;
    case "pattern":
      return typeof value === "string" && new RegExp(`^(?:${constraint.value})$`).test(value);
  }
}

export function matchesScalarBase(
  valueObject: ScalarValueObject,
  value: Value | undefined,
): value is string | number {
  return valueObject.base === "string" ? typeof value === "string" : Number.isInteger(value);
}

/** Returns the first constraint of the scalar value object that the value breaks, if any. */
export function firstBrokenConstraint(
  valueObject: ScalarValueObject,
  value: string | number,
): Constraint | undefined {
  return valueObject.constraints.find((constraint) => !satisfiesConstraint(constraint, value));
}

/** Checks a value against a field type, the way generated smart constructors would at the boundary. */
export function validateValue(
  index: PackIndex,
  type: FieldType,
  value: Value | undefined,
  path: string,
): Rejection | null {
  switch (type.kind) {
    case "primitive":
      return validatePrimitive(type.name, value, path);
    case "valueObject":
      return validateValueObject(index, type.ref, value, path);
    case "entity":
      return isValueRecord(value) ? null : malformed(path, `an object of ${type.ref}`);
    case "list":
      return validateList(index, type.of, value, path);
    case "optional":
      return value === null ? null : validateValue(index, type.of, value, path);
  }
}

function validatePrimitive(
  name: "string" | "integer" | "boolean" | "date" | "timestamp",
  value: Value | undefined,
  path: string,
): Rejection | null {
  const isValid =
    (name === "string" && typeof value === "string") ||
    (name === "integer" && Number.isInteger(value)) ||
    (name === "boolean" && typeof value === "boolean") ||
    (name === "date" && typeof value === "string" && ISO_DATE.test(value)) ||
    (name === "timestamp" && typeof value === "string" && ISO_TIMESTAMP.test(value));
  return isValid ? null : malformed(path, name);
}

function validateValueObject(
  index: PackIndex,
  name: string,
  value: Value | undefined,
  path: string,
): Rejection | null {
  const valueObject = index.valueObjects.get(name);
  if (valueObject === undefined) return { kind: "fault", message: `unknown value object ${name}` };
  switch (valueObject.kind) {
    case "scalar": {
      if (!matchesScalarBase(valueObject, value))
        return malformed(path, `${valueObject.base} (${name})`);
      const broken = firstBrokenConstraint(valueObject, value);
      return broken === undefined
        ? null
        : { kind: "constraintViolated", errorCode: broken.errorCode, path };
    }
    case "enum":
      return typeof value === "string" &&
        valueObject.members.some((member) => member.codeName === value)
        ? null
        : malformed(path, `one of the members of ${name}`);
    case "record": {
      if (!isValueRecord(value)) return malformed(path, `an object of ${name}`);
      for (const field of valueObject.fields) {
        const rejection = validateValue(
          index,
          field.type,
          value[field.codeName],
          `${path}.${field.codeName}`,
        );
        if (rejection !== null) return rejection;
      }
      return null;
    }
  }
}

function validateList(
  index: PackIndex,
  elementType: FieldType,
  value: Value | undefined,
  path: string,
): Rejection | null {
  if (!Array.isArray(value)) return malformed(path, "a list");
  for (const [position, element] of value.entries()) {
    const rejection = validateValue(index, elementType, element, `${path}[${position}]`);
    if (rejection !== null) return rejection;
  }
  return null;
}

function malformed(path: string, expected: string): Rejection {
  return { kind: "malformedArgument", path, expected };
}
