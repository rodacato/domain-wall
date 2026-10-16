export type DiffKind = "same" | "added" | "removed";

export interface DiffLine {
  readonly kind: DiffKind;
  readonly text: string;
  /** 1-based line in the old text, absent for added lines. */
  readonly oldLine: number | null;
  /** 1-based line in the new text, absent for removed lines. */
  readonly newLine: number | null;
}

/** A line-by-line difference between two texts, built from their longest common subsequence. */
export function diffLines(before: string, after: string): readonly DiffLine[] {
  const a = before === "" ? [] : before.replace(/\n$/, "").split("\n");
  const b = after === "" ? [] : after.replace(/\n$/, "").split("\n");

  const width = b.length + 1;
  const table = new Int32Array((a.length + 1) * width);
  const common = (i: number, j: number): number => table[i * width + j] ?? 0;
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i * width + j] =
        a[i] === b[j] ? common(i + 1, j + 1) + 1 : Math.max(common(i + 1, j), common(i, j + 1));
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    const left = a[i];
    const right = b[j];
    if (left !== undefined && right !== undefined && left === right) {
      result.push({ kind: "same", text: left, oldLine: i + 1, newLine: j + 1 });
      i += 1;
      j += 1;
    } else if (
      right === undefined ||
      (left !== undefined && common(i + 1, j) >= common(i, j + 1))
    ) {
      result.push({ kind: "removed", text: left ?? "", oldLine: i + 1, newLine: null });
      i += 1;
    } else {
      result.push({ kind: "added", text: right, oldLine: null, newLine: j + 1 });
      j += 1;
    }
  }
  return result;
}

/** Hides long runs of unchanged lines, keeping `context` of them around every change. */
export function collapseUnchanged(
  lines: readonly DiffLine[],
  context: number,
): readonly (DiffLine | { readonly kind: "gap"; readonly hidden: number })[] {
  const keep = new Array<boolean>(lines.length).fill(false);
  lines.forEach((line, position) => {
    if (line.kind === "same") return;
    for (
      let near = Math.max(0, position - context);
      near <= Math.min(lines.length - 1, position + context);
      near += 1
    ) {
      keep[near] = true;
    }
  });
  const collapsed: (DiffLine | { readonly kind: "gap"; readonly hidden: number })[] = [];
  let hidden = 0;
  lines.forEach((line, position) => {
    if (keep[position] === true) {
      if (hidden > 0) collapsed.push({ kind: "gap", hidden });
      hidden = 0;
      collapsed.push(line);
    } else {
      hidden += 1;
    }
  });
  if (hidden > 0) collapsed.push({ kind: "gap", hidden });
  return collapsed;
}
