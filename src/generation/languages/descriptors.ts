import type { ProgrammingLanguageId } from "../../domain/language/ProgrammingLanguage";
import type { LanguageDescriptor } from "./LanguageDescriptor";
import { pythonDescriptor } from "./python/pythonDescriptor";
import { rubyDescriptor } from "./ruby/rubyDescriptor";
import { typescriptDescriptor } from "./typescript/typescriptDescriptor";

/** Languages the generator supports so far; each new language adds one descriptor and a template directory. */
const DESCRIPTORS: Partial<Record<ProgrammingLanguageId, LanguageDescriptor>> = {
  typescript: typescriptDescriptor,
  python: pythonDescriptor,
  ruby: rubyDescriptor,
};

export function descriptorFor(language: ProgrammingLanguageId): LanguageDescriptor | undefined {
  return DESCRIPTORS[language];
}
