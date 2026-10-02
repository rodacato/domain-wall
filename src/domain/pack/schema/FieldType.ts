import { z } from "zod";
import { typeNameSchema, type TypeName } from "../naming/CodeName";

export const PRIMITIVE_NAMES = ["string", "integer", "boolean", "date", "timestamp"] as const;
export type PrimitiveName = (typeof PRIMITIVE_NAMES)[number];

/**
 * The type of a field or parameter. v1 has no decimal type: its semantics differ across
 * languages, so money is modeled as an integer in minor units.
 */
export type FieldType =
  | { readonly kind: "primitive"; readonly name: PrimitiveName }
  | { readonly kind: "valueObject"; readonly ref: TypeName }
  | { readonly kind: "entity"; readonly ref: TypeName }
  | { readonly kind: "list"; readonly of: FieldType }
  | { readonly kind: "optional"; readonly of: FieldType };

export const fieldTypeSchema: z.ZodType<FieldType> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("primitive"), name: z.enum(PRIMITIVE_NAMES) }),
    z.strictObject({ kind: z.literal("valueObject"), ref: typeNameSchema }),
    z.strictObject({ kind: z.literal("entity"), ref: typeNameSchema }),
    z.strictObject({ kind: z.literal("list"), of: fieldTypeSchema }),
    z.strictObject({ kind: z.literal("optional"), of: fieldTypeSchema }),
  ]),
);
