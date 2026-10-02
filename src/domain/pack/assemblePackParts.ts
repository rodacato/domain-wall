import { err, ok, type Result } from "../shared/Result";
import { issueAt, type ValidationIssue } from "../shared/ValidationIssue";

/**
 * Curated packs are authored as several JSON files so that each stays readable. This merges them
 * into the single document the schema describes.
 *
 * Merge rules, applied in file-name order: arrays are concatenated; objects are merged when their
 * keys are disjoint; anything else defined twice is a conflict.
 */
export function assemblePackParts(
  partsByFileName: Readonly<Record<string, unknown>>,
): Result<Record<string, unknown>, readonly ValidationIssue[]> {
  const merged: Record<string, unknown> = {};
  const issues: ValidationIssue[] = [];

  for (const fileName of Object.keys(partsByFileName).sort()) {
    const part = partsByFileName[fileName];
    if (!isPlainObject(part)) {
      issues.push(issueAt("assemble", [fileName], "a pack part must be a JSON object"));
      continue;
    }
    for (const [key, value] of Object.entries(part)) {
      const existing = merged[key];
      if (existing === undefined) {
        merged[key] = value;
      } else if (Array.isArray(existing) && Array.isArray(value)) {
        const earlierItems: unknown[] = existing;
        const laterItems: unknown[] = value;
        merged[key] = [...earlierItems, ...laterItems];
      } else if (isPlainObject(existing) && isPlainObject(value)) {
        const duplicateKey = Object.keys(value).find((childKey) => childKey in existing);
        if (duplicateKey !== undefined) {
          issues.push(
            issueAt("assemble", [fileName, key, duplicateKey], "defined in more than one part"),
          );
        } else {
          merged[key] = { ...existing, ...value };
        }
      } else {
        issues.push(issueAt("assemble", [fileName, key], "defined in more than one part"));
      }
    }
  }

  return issues.length > 0 ? err(issues) : ok(merged);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
