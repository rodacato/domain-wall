import type { ProgrammingLanguageId } from "../domain/language/ProgrammingLanguage";
import type { CodeUnit } from "../domain/wall/CodeStage";

/** The lines (1-based, inclusive) of a generated file that came from one pack concept, for example "Order.rule.OrderMustHaveLines". */
export interface Anchor {
  readonly ref: string;
  readonly startLine: number;
  readonly endLine: number;
}

export type FileRole = "source" | "test" | "support";

export interface GeneratedFile {
  readonly path: string;
  readonly role: FileRole;
  readonly content: string;
  readonly anchors: readonly Anchor[];
  /** The domain unit a source file implements; null for tests and support files. */
  readonly unit: CodeUnit | null;
}

export interface GeneratedProject {
  readonly language: ProgrammingLanguageId;
  readonly files: readonly GeneratedFile[];
  /** The file that runs every test when executed. */
  readonly entry: string;
}
