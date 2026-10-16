import {
  PROGRAMMING_LANGUAGES,
  type ProgrammingLanguageId,
} from "../domain/language/ProgrammingLanguage";
import type { TemplateLibrary } from "../generation/languages/LanguageDescriptor";

export type TemplatesByLanguage = Readonly<Record<ProgrammingLanguageId, TemplateLibrary>>;

/** Groups template files named `.../languages/<language>/templates/<name>.mustache` by language. */
export function loadTemplates(sourceByPath: Readonly<Record<string, string>>): TemplatesByLanguage {
  const libraries = Object.fromEntries(
    PROGRAMMING_LANGUAGES.map((language) => [language, {}]),
  ) as Record<ProgrammingLanguageId, Record<string, string>>;
  for (const [path, source] of Object.entries(sourceByPath)) {
    const match = /\/languages\/([^/]+)\/templates\/([^/]+)\.mustache$/.exec(path);
    const language = PROGRAMMING_LANGUAGES.find((candidate) => candidate === match?.[1]);
    const name = match?.[2];
    if (language !== undefined && name !== undefined) libraries[language][name] = source;
  }
  return libraries;
}
