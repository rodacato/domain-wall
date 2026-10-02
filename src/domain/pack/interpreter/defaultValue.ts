import type { PackIndex } from "../PackIndex";
import type { FieldType } from "../schema/FieldType";
import { err, ok, type Result } from "../../shared/Result";
import type { Value } from "./Value";

/**
 * A valid placeholder for a type: value-object examples where they exist, otherwise the simplest
 * legal value. Scenarios and walkthroughs rely on this to omit arguments they do not care about.
 */
export function defaultValue(index: PackIndex, type: FieldType): Result<Value, string> {
  switch (type.kind) {
    case "primitive":
      return ok(defaultPrimitive(type.name));
    case "valueObject": {
      const valueObject = index.valueObjects.get(type.ref);
      if (valueObject === undefined) return err(`unknown value object ${type.ref}`);
      if (valueObject.kind === "enum") return ok(valueObject.members[0]?.codeName ?? null);
      return ok(valueObject.examples.valid[0] ?? null);
    }
    case "entity":
      return err(
        `an entity (${type.ref}) has no default value; build it with a construct expression`,
      );
    case "list":
      return ok([]);
    case "optional":
      return ok(null);
  }
}

function defaultPrimitive(name: "string" | "integer" | "boolean" | "date" | "timestamp"): Value {
  switch (name) {
    case "string":
      return "example";
    case "integer":
      return 1;
    case "boolean":
      return false;
    case "date":
      return "2026-01-01";
    case "timestamp":
      return "2026-01-01T00:00:00Z";
  }
}
