import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { NoteKind } from "../../domain/wall/Note";
import type { Placement } from "../../domain/wall/Placement";
import type { NoteEmphasis } from "../../domain/wall/WallState";

interface StickyNoteProps {
  readonly kind: NoteKind;
  readonly label: string;
  readonly placement: Placement;
  readonly emphasis: NoteEmphasis;
  /** Position among the notes dropped together; later notes fall a little after earlier ones. */
  readonly dropOrder: number;
}

const MAXIMUM_DROP_DELAY_SECONDS = 1.5;

/** A sticky note. The outer element moves it between layouts; the inner one makes it drop in when it first appears. */
export function StickyNote({
  kind,
  label,
  placement,
  emphasis,
  dropOrder,
}: StickyNoteProps): ReactNode {
  const delay = Math.min(MAXIMUM_DROP_DELAY_SECONDS, dropOrder * 0.03);
  return (
    <motion.div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: placement.width,
        height: placement.height,
      }}
      initial={{ x: placement.x, y: placement.y, rotate: placement.rotation }}
      animate={{
        x: placement.x,
        y: placement.y,
        rotate: placement.rotation,
        opacity: emphasis === "dimmed" ? 0.3 : 1,
      }}
      transition={{ type: "spring", stiffness: 90, damping: 18 }}
    >
      <motion.div
        className={`note note--${kind} ${emphasis === "highlighted" ? "note--highlighted" : ""} ${emphasis === "rejected" ? "note--rejected" : ""}`}
        style={{ left: 0, top: 0, width: "100%", height: "100%" }}
        initial={{ y: -260, opacity: 0, scale: 0.88, rotate: 9 }}
        animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ type: "spring", stiffness: 160, damping: 15, delay }}
      >
        {label}
      </motion.div>
    </motion.div>
  );
}
