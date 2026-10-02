import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  compareCatalogs,
  flattenCatalog,
  type FlatCatalog,
} from "../src/domain/locale/compareCatalogs";
import {
  CANONICAL_LOCALE,
  SUPPORTED_LOCALES,
  type LocaleCode,
} from "../src/domain/locale/LocaleRegistry";
import type { ValidationIssue } from "../src/domain/shared/ValidationIssue";

const LOCALES_ROOT = "src/content/locales";

function namespacesOf(locale: LocaleCode): string[] {
  const directory = join(LOCALES_ROOT, locale);
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.replace(/\.json$/, ""));
}

function loadCatalog(locale: LocaleCode, namespace: string): FlatCatalog {
  const file = join(LOCALES_ROOT, locale, `${namespace}.json`);
  return existsSync(file) ? flattenCatalog(JSON.parse(readFileSync(file, "utf8"))) : {};
}

const issues: ValidationIssue[] = [];
const allNamespaces = new Set(SUPPORTED_LOCALES.flatMap(namespacesOf));
for (const namespace of [...allNamespaces].sort()) {
  const catalogs = Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [locale, loadCatalog(locale, namespace)]),
  ) as Record<LocaleCode, FlatCatalog>;
  if (Object.keys(catalogs[CANONICAL_LOCALE]).length === 0) {
    issues.push({
      ruleId: "i18n",
      path: namespace,
      message: `namespace has no ${CANONICAL_LOCALE} catalog`,
    });
    continue;
  }
  issues.push(...compareCatalogs(catalogs, namespace));
}

if (issues.length > 0) {
  console.error(`✗ translations: ${issues.length} issue(s)`);
  for (const issue of issues) console.error(`  ${issue.path}: ${issue.message}`);
  process.exit(1);
}
console.log(
  `✓ translations: ${allNamespaces.size} namespace(s) complete in ${SUPPORTED_LOCALES.join(", ")}`,
);
