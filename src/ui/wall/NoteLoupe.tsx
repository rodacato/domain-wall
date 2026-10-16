import type { ReactNode } from "react";
import type { NoteKind } from "../../domain/wall/Note";

export interface HoveredNote {
  readonly kind: NoteKind;
  readonly label: string;
  /** The note's box on screen, relative to the wall. */
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

const NOTE_FONT_PIXELS = 17;
const LEGIBLE_FONT_PIXELS = 13;
const LOUPE_HEIGHT = 112;

/** Whether notes at this camera scale are too small to read, so hovering one should magnify it. */
export function needsLoupe(scale: number): boolean {
  return NOTE_FONT_PIXELS * scale < LEGIBLE_FONT_PIXELS;
}

/** A full-size copy of the hovered note, above it (or below it near the top of the wall). Screen readers already have the note's text. */
export function NoteLoupe({ note }: { readonly note: HoveredNote }): ReactNode {
  const above = note.top - LOUPE_HEIGHT - 8;
  return (
    <div
      className={`note note--${note.kind} note-loupe`}
      aria-hidden="true"
      style={{
        left: note.left + note.width / 2,
        top: above >= 8 ? above : note.top + note.height + 8,
        height: LOUPE_HEIGHT,
      }}
    >
      {note.label}
    </div>
  );
}
