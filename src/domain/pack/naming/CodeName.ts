import { z } from "zod";

/**
 * Code names are English identifiers that generated code uses verbatim (after conversion to each
 * language's convention). They are deliberately restrictive:
 *
 * - every word is a capital letter followed by at least one lowercase letter or digit, so there are
 *   no consecutive capitals ("Cfdi", never "CFDI");
 * - therefore splitting into words and re-joining is lossless, and a name in snake_case maps back
 *   to exactly one canonical code name.
 */
export const TYPE_NAME_PATTERN = /^[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)*$/;
export const MEMBER_NAME_PATTERN = /^[a-z][a-z0-9]*(?:[A-Z][a-z0-9]+)*$/;

/** PascalCase name of a type, state, event, command, rule or error code. */
export const typeNameSchema = z
  .string()
  .regex(
    TYPE_NAME_PATTERN,
    "type names must be PascalCase made of words like 'Order' or 'OrderLine', without consecutive capitals",
  )
  .brand<"TypeName">();
export type TypeName = z.infer<typeof typeNameSchema>;

/** camelCase name of a field, parameter or derived value. */
export const memberNameSchema = z
  .string()
  .regex(
    MEMBER_NAME_PATTERN,
    "member names must be camelCase like 'orderId', without consecutive capitals",
  )
  .brand<"MemberName">();
export type MemberName = z.infer<typeof memberNameSchema>;

export type CodeName = TypeName | MemberName;
