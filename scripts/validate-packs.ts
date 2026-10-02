import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { validateSemantics } from "../src/domain/pack/validation/validateSemantics";
import type { ValidationIssue } from "../src/domain/shared/ValidationIssue";
import { loadPackDirectory } from "./lib/loadPackDirectory";

const PACKS_ROOT = "packs";

function packDirectories(): string[] {
  const direct = readdirSync(PACKS_ROOT)
    .map((name) => join(PACKS_ROOT, name))
    .filter((path) => statSync(path).isDirectory());
  return direct.flatMap((path) => (path.endsWith("presets") ? packDirectoriesIn(path) : [path]));
}

function packDirectoriesIn(root: string): string[] {
  return readdirSync(root)
    .map((name) => join(root, name))
    .filter((path) => statSync(path).isDirectory());
}

function report(label: string, issues: readonly ValidationIssue[]): void {
  console.error(`✗ ${label}: ${issues.length} issue(s)`);
  for (const issue of issues) console.error(`  [${issue.ruleId}] ${issue.path}: ${issue.message}`);
}

let failures = 0;
for (const directory of packDirectories()) {
  const parsed = loadPackDirectory(directory);
  if (!parsed.ok) {
    report(directory, parsed.error);
    failures += 1;
    continue;
  }
  const validated = validateSemantics(parsed.value);
  if (!validated.ok) {
    report(directory, validated.error);
    failures += 1;
    continue;
  }
  console.log(`✓ ${directory}`);
}
process.exit(failures === 0 ? 0 : 1);
