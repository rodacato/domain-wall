import type { ProgrammingLanguageId } from "../../domain/language/ProgrammingLanguage";
import { NAMING_PROFILES } from "../../domain/language/ProgrammingLanguage";
import type { CodeName } from "../../domain/pack/naming/CodeName";
import { renderCodeName, splitIntoWords, renderName } from "../../domain/pack/naming/NameStyle";

/** Turns pack code names into identifiers in one language's conventions. */
export interface LanguageNaming {
  readonly type: (codeName: string) => string;
  readonly member: (codeName: string) => string;
  /** Used for file names and module paths. */
  readonly module: (codeName: string) => string;
  /** The error code as the language spells it: a PascalCase string, or a snake_case symbol name. */
  readonly errorCode: (codeName: string) => string;
  /** SCREAMING_SNAKE_CASE, for enum members and constants. */
  readonly constant: (codeName: string) => string;
  /** snake_case in every language, for test names. */
  readonly snake: (codeName: string) => string;
}

export function namingFor(language: ProgrammingLanguageId): LanguageNaming {
  const profile = NAMING_PROFILES[language];
  const snakeErrors = profile.memberStyle === "snake_case" && language !== "python";
  return {
    type: (codeName) => renderCodeName(codeName as CodeName, profile.typeStyle),
    member: (codeName) => renderCodeName(codeName as CodeName, profile.memberStyle),
    module: (codeName) =>
      renderName(
        splitIntoWords(codeName as CodeName),
        language === "typescript" ? "kebab-case" : "snake_case",
      ),
    errorCode: (codeName) =>
      snakeErrors ? renderCodeName(codeName as CodeName, "snake_case") : codeName,
    constant: (codeName) => renderCodeName(codeName as CodeName, "SCREAMING_SNAKE_CASE"),
    snake: (codeName) => renderCodeName(codeName as CodeName, "snake_case"),
  };
}
