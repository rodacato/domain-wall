import type { ProgrammingLanguageId } from "../domain/language/ProgrammingLanguage";

export interface SyntaxIssue {
  /** 1-based line of the problem. */
  readonly line: number;
  readonly column: number;
  /** What the parser found there: an unexpected piece of code, or something missing. */
  readonly kind: "unexpected" | "missing";
  readonly snippet: string;
}

/** Tells whether source code is well formed in a language, without running it. */
export interface SyntaxChecker {
  check(language: ProgrammingLanguageId, source: string): Promise<readonly SyntaxIssue[]>;
  /** The source with every comment blanked out, so positions and line numbers stay where they were. */
  withoutComments(language: ProgrammingLanguageId, source: string): Promise<string>;
}
