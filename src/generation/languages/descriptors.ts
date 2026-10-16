import type { ProgrammingLanguageId } from "../../domain/language/ProgrammingLanguage";
import type { LanguageDescriptor } from "./LanguageDescriptor";
import { typescriptDescriptor } from "./typescript/typescriptDescriptor";

/** Languages the generator supports so far; each new language adds one descriptor and a template directory. */
const DESCRIPTORS: Partial<Record<ProgrammingLanguageId, LanguageDescriptor>> = {
  typescript: typescriptDescriptor,
};

export function descriptorFor(language: ProgrammingLanguageId): LanguageDescriptor | undefined {
  return DESCRIPTORS[language];
}
