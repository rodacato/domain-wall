import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import type { CourseSession } from "../../application/CourseSession";
import { descriptionOfConcept, labelOfConcept } from "../../domain/pack/conceptLabels";
import type { GlossaryState } from "../../domain/wall/WallState";
import { useI18n } from "../i18n/I18n";

interface GlossaryBoardProps {
  readonly session: CourseSession;
  readonly glossary: GlossaryState;
}

/** The living glossary of module 2: terms arrive as the experts say them; an ambiguous one is flagged, then split by context. */
export function GlossaryBoard({ session, glossary }: GlossaryBoardProps): ReactNode {
  const { locale, t } = useI18n();
  const { index } = session;
  const { ambiguousTerm } = index.pack;
  const textOf = (name: string): { title: string; description: string } => ({
    title: labelOfConcept(index, name)?.[locale] ?? name,
    description: descriptionOfConcept(index, name)?.[locale] ?? "",
  });

  return (
    <aside className="glossary" tabIndex={0} aria-label={t("ui.glossary.title")}>
      <h2 className="glossary__title">{t("ui.glossary.title")}</h2>
      {glossary.entries.length === 0 && <p className="glossary__empty">{t("ui.glossary.empty")}</p>}
      <ul className="glossary__list">
        <AnimatePresence>
          {glossary.entries.map((name) => {
            const isAmbiguous = glossary.ambiguous.includes(name);
            const isResolved = glossary.resolved.includes(name);
            const entry = textOf(name);
            return (
              <motion.li
                key={name}
                layout
                className={`glossary__entry ${isAmbiguous ? "glossary__entry--ambiguous" : ""}`}
                initial={{ opacity: 0, x: -30, rotate: -2 }}
                animate={{ opacity: 1, x: 0, rotate: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 140, damping: 16 }}
              >
                <div className="glossary__term">
                  <strong>{entry.title}</strong>
                  {isAmbiguous && (
                    <span className="glossary__badge">{t("ui.glossary.ambiguous")}</span>
                  )}
                  {isResolved && (
                    <span className="glossary__badge glossary__badge--resolved">
                      {t("ui.glossary.resolved")}
                    </span>
                  )}
                </div>
                {entry.description !== "" && !isAmbiguous && !isResolved && (
                  <p className="glossary__definition">{entry.description}</p>
                )}
                {(isAmbiguous || isResolved) && name === ambiguousTerm.codeName && (
                  <ul className="glossary__meanings">
                    {ambiguousTerm.meanings.map((meaning) => (
                      <li key={meaning.context}>
                        <span className="glossary__where">
                          {t("ui.glossary.meaningIn", {
                            context:
                              labelOfConcept(index, meaning.context)?.[locale] ?? meaning.context,
                          })}
                        </span>
                        {isResolved && (
                          <strong>
                            {" "}
                            {labelOfConcept(index, meaning.concept)?.[locale] ?? meaning.concept}
                          </strong>
                        )}
                        <span className="glossary__definition"> {meaning.definition[locale]}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </aside>
  );
}
