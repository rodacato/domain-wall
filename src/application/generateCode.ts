import type { ProgrammingLanguageId } from "../domain/language/ProgrammingLanguage";
import type { PackIndex } from "../domain/pack/PackIndex";
import { err, type Result } from "../domain/shared/Result";
import type { GeneratedProject } from "../generation/GeneratedProject";
import { generateProject } from "../generation/generateProject";
import { descriptorFor } from "../generation/languages/descriptors";
import type { TemplatesByLanguage } from "./loadTemplates";

/** Use case: the domain code and tests of the pack in the language the learner chose. */
export function generateCode(
  index: PackIndex,
  language: ProgrammingLanguageId,
  templates: TemplatesByLanguage,
): Result<GeneratedProject, readonly string[]> {
  const descriptor = descriptorFor(language);
  if (descriptor === undefined) return err([`no generator for ${language}`]);
  return generateProject(index, descriptor, templates[language]);
}
