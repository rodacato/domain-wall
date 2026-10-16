import { validateSemantics } from "../src/domain/pack/validation/validateSemantics";
import type { ValidationIssue } from "../src/domain/shared/ValidationIssue";
import { loadPackDirectory } from "./lib/loadPackDirectory";
import { packDirectories } from "./lib/packDirectories";

function report(label: string, issues: readonly ValidationIssue[]): void {
  console.error(`✗ ${label}: ${issues.length} issue(s)`);
  for (const issue of issues) console.error(`  [${issue.ruleId}] ${issue.path}: ${issue.message}`);
}

const requestedDirectories = process.argv.slice(2);
const directories = requestedDirectories.length > 0 ? requestedDirectories : packDirectories();

let failures = 0;
for (const directory of directories) {
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
