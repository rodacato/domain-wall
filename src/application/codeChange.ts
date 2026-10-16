import type { ProgrammingLanguageId } from "../domain/language/ProgrammingLanguage";
import type { PackIndex } from "../domain/pack/PackIndex";
import type { CodeUnit } from "../domain/wall/CodeStage";
import { collapseUnchanged, diffLines, type DiffLine } from "../generation/diffLines";
import { sourceFileOf } from "./codeView";
import { generateCode } from "./generateCode";
import type { TemplatesByLanguage } from "./loadTemplates";

export type { DiffLine };
export type ChangeEntry = DiffLine | { readonly kind: "gap"; readonly hidden: number };

const CONTEXT_LINES = 3;

/** What a business change did to the generated code of a unit: its added and removed lines, with a little context. */
export function codeChangeOf(
  before: PackIndex,
  after: PackIndex,
  language: ProgrammingLanguageId,
  templates: TemplatesByLanguage,
  unit: CodeUnit,
): { readonly path: string; readonly entries: readonly ChangeEntry[] } | undefined {
  const old = generateCode(before, language, templates);
  const current = generateCode(after, language, templates);
  if (!old.ok || !current.ok) return undefined;
  const oldFile = sourceFileOf(old.value, unit);
  const newFile = sourceFileOf(current.value, unit);
  if (oldFile === undefined || newFile === undefined) return undefined;
  return {
    path: newFile.path,
    entries: collapseUnchanged(diffLines(oldFile.content, newFile.content), CONTEXT_LINES),
  };
}
