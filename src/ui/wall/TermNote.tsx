import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import type { PackIndex } from "../../domain/pack/PackIndex";
import type { Rectangle } from "../../domain/wall/Placement";
import { termFaceIn } from "../../domain/wall/termFace";
import { useI18n } from "../i18n/I18n";

interface TermNoteProps {
  readonly index: PackIndex;
  readonly context: string | null;
  readonly rectangle: Rectangle;
}

/** The floating note of the ambiguous word. It turns into a different concept each time it crosses a boundary. */
export function TermNote({ index, context, rectangle }: TermNoteProps): ReactNode {
  const { locale, t } = useI18n();
  const face = context === null ? undefined : termFaceIn(index, context);
  const neutralTitle = index.pack.ambiguousTerm.label[locale];

  return (
    <motion.div
      className="term"
      style={{ width: rectangle.width, height: rectangle.height }}
      initial={{ x: rectangle.x, y: rectangle.y - 160, opacity: 0, rotate: -6 }}
      animate={{ x: rectangle.x, y: rectangle.y, opacity: 1, rotate: -1.5 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 70, damping: 16 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={context ?? "neutral"}
          initial={{ opacity: 0, rotateX: 80 }}
          animate={{ opacity: 1, rotateX: 0 }}
          exit={{ opacity: 0, rotateX: -80 }}
          transition={{ duration: 0.28 }}
        >
          {face === undefined ? (
            <>
              <h3 className="term__title">{neutralTitle}</h3>
              <p className="term__hint">{t("ui.term.neutralHint")}</p>
            </>
          ) : (
            <>
              <h3 className="term__title">{face.title[locale]}</h3>
              <p className="term__definition">{face.definition[locale]}</p>
              <ul className="term__fields">
                {face.fields.map((field) => (
                  <li key={field[locale]}>{field[locale]}</li>
                ))}
              </ul>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
