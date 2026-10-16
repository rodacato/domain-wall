import type { CodeUnit } from "../domain/wall/CodeStage";
import { sameCodeUnit } from "../domain/wall/CodeStage";
import type { Anchor, GeneratedFile, GeneratedProject } from "../generation/GeneratedProject";

export type { Anchor, GeneratedFile, GeneratedProject };

/** The generated source file that implements a unit of the domain. */
export function sourceFileOf(
  project: GeneratedProject,
  unit: CodeUnit | null,
): GeneratedFile | undefined {
  return project.files.find((file) => file.role === "source" && sameCodeUnit(file.unit, unit));
}

function matchesFocus(anchor: Anchor, focus: string): boolean {
  if (anchor.ref === focus) return true;
  const rest = anchor.ref.startsWith(`${focus}.`) ? anchor.ref.slice(focus.length + 1) : "";
  return /^\d+$/.test(rest);
}

/** The anchors a focus reference points at: the reference itself, and the numbered branches of a transition. */
export function anchorsOfFocus(file: GeneratedFile, focus: string): readonly Anchor[] {
  return file.anchors.filter((anchor) => matchesFocus(anchor, focus));
}

/** The lines (1-based) that belong to the focus, or null when nothing is focused. */
export function focusedLines(
  file: GeneratedFile,
  focus: string | null,
): ReadonlySet<number> | null {
  if (focus === null) return null;
  const lines = new Set<number>();
  for (const anchor of anchorsOfFocus(file, focus)) {
    for (let line = anchor.startLine; line <= anchor.endLine; line += 1) lines.add(line);
  }
  return lines;
}

/** The smallest anchor around a line, which is the concept that line mostly implements. */
export function innermostAnchorAt(file: GeneratedFile, line: number): Anchor | undefined {
  return file.anchors
    .filter((anchor) => anchor.startLine <= line && line <= anchor.endLine)
    .sort((a, b) => a.endLine - a.startLine - (b.endLine - b.startLine))[0];
}

/** One anchor per reference, in the order the code reads. */
export function anchorsInReadingOrder(file: GeneratedFile): readonly Anchor[] {
  const seen = new Set<string>();
  return [...file.anchors]
    .sort((a, b) => a.startLine - b.startLine || b.endLine - a.endLine)
    .filter((anchor) => {
      if (seen.has(anchor.ref)) return false;
      seen.add(anchor.ref);
      return true;
    });
}
