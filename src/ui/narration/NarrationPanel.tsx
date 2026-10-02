import type { ReactNode } from "react";
import type { CourseSession } from "../../application/CourseSession";
import { allConcepts } from "../../domain/course/Syllabus";
import { dialogueSegments } from "../../domain/pack/dialogueSegments";
import type { SceneStep } from "../../domain/wall/Scene";
import { useI18n } from "../i18n/I18n";

interface NarrationPanelProps {
  readonly session: CourseSession;
  readonly step: SceneStep;
}

/** A pastel colour derived from an expert's avatar seed, stable across sessions. */
function avatarColour(seed: string): string {
  let hash = 0;
  for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) % 360;
  return `hsl(${hash} 70% 82%)`;
}

export function NarrationPanel({ session, step }: NarrationPanelProps): ReactNode {
  const { locale, t } = useI18n();
  const concept =
    step.concept === null
      ? undefined
      : allConcepts(session.syllabus).find((candidate) => candidate.id === step.concept);
  const lines = step.dialogue === null ? [] : session.index.pack.dialogues[step.dialogue];

  return (
    <aside className="narration">
      {concept !== undefined && (
        <section className="narration__concept">
          {concept.perspective === "functional" && (
            <span className="narration__tag">{t("ui.narration.functionalPerspective")}</span>
          )}
          <h2>{t(`course.concepts.${concept.id}.title`)}</h2>
          <p>{t(`course.concepts.${concept.id}.summary`)}</p>
        </section>
      )}
      <ul className="dialogue">
        {lines.map((line, position) => {
          const expert = session.index.experts.get(line.speaker);
          return (
            <li className="dialogue__line" key={`${step.id}-${position}`}>
              <span
                className="dialogue__avatar"
                style={
                  {
                    "--avatar": avatarColour(expert?.avatarSeed ?? line.speaker),
                  } as React.CSSProperties
                }
              >
                {(expert?.name ?? line.speaker).charAt(0)}
              </span>
              <div>
                <div className="dialogue__speaker">
                  {expert?.name ?? line.speaker}
                  <span className="dialogue__role">{expert?.role[locale]}</span>
                </div>
                <p className="dialogue__text">
                  {dialogueSegments(session.index, line.text, locale).map(
                    (segment, segmentPosition) =>
                      segment.kind === "term" ? (
                        <span className="dialogue__term" key={segmentPosition}>
                          {segment.text}
                        </span>
                      ) : (
                        <span key={segmentPosition}>{segment.text}</span>
                      ),
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
