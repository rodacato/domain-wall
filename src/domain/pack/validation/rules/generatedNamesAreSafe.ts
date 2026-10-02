import {
  GENERATED_SUPPORT_TYPE_NAMES,
  NAMING_PROFILES,
  PROGRAMMING_LANGUAGES,
} from "../../../language/ProgrammingLanguage";
import { issueAt, type ValidationIssue } from "../../../shared/ValidationIssue";
import {
  generatedMemberSymbols,
  generatedTypeSymbols,
  renderMemberSymbol,
  renderTypeSymbol,
} from "../../naming/SymbolTable";
import type { SemanticRule } from "../SemanticRule";

const RULE_ID = "S07";

/**
 * Builds the symbol table the generator will produce (declared names plus derived companions such
 * as `OrderError`) and checks it in every supported language: no collisions between derived and
 * declared names, no reserved words, no clashes with standard-library types.
 */
export const generatedNamesAreSafe: SemanticRule = {
  id: RULE_ID,
  description: "generated identifiers are legal and collision-free in every supported language",
  check: ({ pack }) => {
    const issues: ValidationIssue[] = [];
    const typeSymbols = generatedTypeSymbols(pack);
    const memberSymbols = generatedMemberSymbols(pack);

    for (const language of PROGRAMMING_LANGUAGES) {
      const profile = NAMING_PROFILES[language];
      const owners = new Map<string, string>();
      for (const symbol of typeSymbols) {
        const rendered = renderTypeSymbol(language, symbol);
        const at = ["generatedNames", language, rendered];
        const previous = owners.get(rendered);
        if (previous !== undefined && previous !== symbol.owner) {
          issues.push(
            issueAt(
              RULE_ID,
              at,
              `${symbol.owner} and ${previous} both generate the type name "${rendered}" in ${language}`,
            ),
          );
        }
        owners.set(rendered, symbol.owner);
        if (profile.reservedTypeNames.has(rendered) || profile.reservedWords.has(rendered)) {
          issues.push(
            issueAt(
              RULE_ID,
              at,
              `"${rendered}" (${symbol.owner}) shadows a reserved or built-in name in ${language}`,
            ),
          );
        }
        if (GENERATED_SUPPORT_TYPE_NAMES.includes(rendered)) {
          issues.push(
            issueAt(
              RULE_ID,
              at,
              `"${rendered}" (${symbol.owner}) collides with a support type the generator itself defines`,
            ),
          );
        }
      }
      for (const symbol of memberSymbols) {
        const rendered = renderMemberSymbol(language, symbol);
        if (profile.reservedWords.has(rendered)) {
          issues.push(
            issueAt(
              RULE_ID,
              ["generatedNames", language, symbol.owner],
              `"${rendered}" is a reserved word in ${language}`,
            ),
          );
        }
      }
    }
    return issues;
  },
};
