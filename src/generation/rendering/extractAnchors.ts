import { err, ok, type Result } from "../../domain/shared/Result";
import type { Anchor } from "../GeneratedProject";

const MARKER = /⟦(\/?)anchor(?: ([^⟧]+))?⟧/g;

export interface AnchoredText {
  readonly content: string;
  readonly anchors: readonly Anchor[];
}

/** Templates mark ranges with ⟦anchor Ref⟧ ... ⟦/anchor⟧; this removes the markers and records the lines they covered. */
export function extractAnchors(raw: string): Result<AnchoredText, string> {
  const keptLines: string[] = [];
  const anchors: Anchor[] = [];
  const open: { readonly ref: string; readonly startLine: number }[] = [];

  for (const line of raw.split("\n")) {
    const markers = [...line.matchAll(MARKER)];
    const stripped = line.replace(MARKER, "");
    const standsAlone = markers.length > 0 && stripped.trim() === "";
    if (!standsAlone) keptLines.push(stripped);

    for (const marker of markers) {
      if (marker[1] === "/") {
        const closing = open.pop();
        if (closing === undefined)
          return err(`closing anchor without an opening one near "${line.trim()}"`);
        anchors.push({
          ref: closing.ref,
          startLine: closing.startLine,
          endLine: Math.max(closing.startLine, keptLines.length),
        });
      } else {
        const ref = marker[2];
        if (ref === undefined) return err("an anchor needs a reference");
        open.push({ ref, startLine: standsAlone ? keptLines.length + 1 : keptLines.length });
      }
    }
  }
  if (open.length > 0) return err(`anchor "${open[open.length - 1]?.ref ?? ""}" was never closed`);

  anchors.sort((a, b) => a.startLine - b.startLine || b.endLine - a.endLine);
  return ok({ content: keptLines.join("\n"), anchors });
}
