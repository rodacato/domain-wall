import type { Literal } from "../schema/Literal";

/** Runtime values are plain JSON: integers, strings, booleans, null, arrays and objects. */
export type Value = Literal;
export type ValueRecord = Readonly<Record<string, Value>>;

export function isValueRecord(value: Value | undefined): value is ValueRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function valuesAreEqual(left: Value, right: Value): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
