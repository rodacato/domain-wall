import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadCatalogs } from "../../application/loadCatalogs";
import { SUPPORTED_LOCALES } from "../../domain/locale/LocaleRegistry";

const UI_ROOT = "src/ui";
const CATALOG_ROOT = "src/content/locales";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".test.ts") ? [path] : [];
  });
}

function literalKeysUsedBy(file: string): string[] {
  const source = readFileSync(file, "utf8");
  return [...source.matchAll(/\bt\(\s*"([^"$]+)"/g)].map((match) => match[1] ?? "");
}

function catalogFiles(): Record<string, unknown> {
  const files: Record<string, unknown> = {};
  for (const locale of SUPPORTED_LOCALES) {
    for (const name of readdirSync(join(CATALOG_ROOT, locale))) {
      const path = join(CATALOG_ROOT, locale, name);
      files[`/${path}`] = JSON.parse(readFileSync(path, "utf8"));
    }
  }
  return files;
}

describe("translation keys used in the UI", () => {
  const catalogs = loadCatalogs(catalogFiles());

  it.each(SUPPORTED_LOCALES)("exist in the %s catalog", (locale) => {
    const missing = sourceFiles(UI_ROOT).flatMap((file) =>
      literalKeysUsedBy(file)
        .filter((key) => !(key in catalogs[locale]))
        .map((key) => `${file}: ${key}`),
    );

    expect(missing).toEqual([]);
  });
});
