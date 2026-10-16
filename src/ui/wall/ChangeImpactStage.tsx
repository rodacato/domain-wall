import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { CourseSession } from "../../application/CourseSession";
import { labelOfConcept } from "../../domain/pack/conceptLabels";
import { ANEMIC_PLACES, changeImpactOf, FORGOTTEN_PLACE } from "../../domain/wall/changeImpact";
import type { ImpactState } from "../../domain/wall/WallState";
import { useI18n } from "../i18n/I18n";

interface ChangeImpactStageProps {
  readonly session: CourseSession;
  readonly impact: ImpactState;
}

/** Module 1: where one business change has to be applied, in an anemic model and in a rich one. */
export function ChangeImpactStage({ session, impact }: ChangeImpactStageProps): ReactNode {
  const { locale, t } = useI18n();
  const change = changeImpactOf(session.index);
  if (change === undefined || impact.model === null) return null;

  const aggregate = labelOfConcept(session.index, change.aggregate)?.[locale] ?? change.aggregate;
  const command = labelOfConcept(session.index, change.command)?.[locale] ?? change.command;
  const stateLabel = (state: string): string =>
    session.index.aggregates
      .get(change.aggregate)
      ?.states.find((candidate) => candidate.codeName === state)?.label[locale] ?? state;
  const everyPlaceRevealed = impact.revealed >= ANEMIC_PLACES.length;

  if (impact.model === "rich") {
    return (
      <div className="impact">
        <h2 className="impact__title">{t("ui.impact.richTitle")}</h2>
        <motion.div
          className="impact__place impact__place--rich"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 14 }}
        >
          <strong className="impact__name">{aggregate}</strong>
          <span className="impact__line">
            {t("ui.impact.transitionBefore", {
              command,
              states: change.statesBefore.map(stateLabel).join(", "),
            })}
          </span>
          <span className="impact__line impact__line--now">
            {t("ui.impact.transitionAfter", {
              command,
              states: change.statesAfter.map(stateLabel).join(", "),
            })}
          </span>
        </motion.div>
        <span className="impact__counter impact__counter--good">{t("ui.impact.onePlace")}</span>
      </div>
    );
  }

  return (
    <div className="impact">
      <h2 className="impact__title">{t("ui.impact.anemicTitle", { aggregate })}</h2>
      <ul className="impact__grid">
        {ANEMIC_PLACES.map((place, position) => {
          const touched = position < impact.revealed;
          const forgotten = everyPlaceRevealed && place === FORGOTTEN_PLACE;
          return (
            <motion.li
              key={place}
              className={`impact__place ${touched ? "impact__place--touched" : ""} ${forgotten ? "impact__place--forgotten" : ""}`}
              animate={{ scale: touched ? 1.02 : 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 14 }}
            >
              <strong className="impact__name">{t(`ui.impact.place.${place}`)}</strong>
              <span className="impact__line">{t("ui.impact.placeLine", { command })}</span>
              {touched && !forgotten && (
                <span className="impact__flag">{t("ui.impact.mustChange")}</span>
              )}
              {forgotten && (
                <span className="impact__flag impact__flag--forgotten">
                  {t("ui.impact.forgotten")}
                </span>
              )}
            </motion.li>
          );
        })}
      </ul>
      {impact.revealed > 0 && (
        <span className="impact__counter">
          {t("ui.impact.counter", { count: impact.revealed })}
        </span>
      )}
    </div>
  );
}
