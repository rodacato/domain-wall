import type { z } from "zod";
import { err, ok, type Result } from "../shared/Result";
import type { ValidationIssue } from "../shared/ValidationIssue";
import { domainPackSchema, type DomainPack } from "./schema/DomainPack";

declare const schemaValidBrand: unique symbol;

/** A pack that has the right shape but whose meaning has not been checked yet. */
export type SchemaValidPack = DomainPack & { readonly [schemaValidBrand]: true };

export function parseDomainPack(
  candidate: unknown,
): Result<SchemaValidPack, readonly ValidationIssue[]> {
  const parsed = domainPackSchema.safeParse(candidate);
  if (parsed.success) return ok(parsed.data as SchemaValidPack);
  return err(parsed.error.issues.map(toValidationIssue));
}

function toValidationIssue(issue: z.core.$ZodIssue): ValidationIssue {
  return { ruleId: "schema", path: issue.path.map(String).join("."), message: issue.message };
}
