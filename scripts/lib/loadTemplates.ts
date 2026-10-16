import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ProgrammingLanguageId } from "../../src/domain/language/ProgrammingLanguage";
import type { TemplateLibrary } from "../../src/generation/languages/LanguageDescriptor";

const LANGUAGES_ROOT = "src/generation/languages";

/** Reads a language's template files from disk, keyed by name without extension. */
export function loadTemplates(language: ProgrammingLanguageId): TemplateLibrary {
  const directory = join(LANGUAGES_ROOT, language, "templates");
  return Object.fromEntries(
    readdirSync(directory)
      .filter((name) => name.endsWith(".mustache"))
      .map((name) => [
        name.replace(/\.mustache$/, ""),
        readFileSync(join(directory, name), "utf8"),
      ]),
  );
}
