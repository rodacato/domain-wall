import type { ReactNode } from "react";
import type { CourseSession } from "../../application/CourseSession";
import { allConcepts, type CourseModule } from "../../domain/course/Syllabus";
import type { ProgrammingLanguageId } from "../../domain/language/ProgrammingLanguage";
import { dialogueSegments } from "../../domain/pack/dialogueSegments";
import type { SceneStep } from "../../domain/wall/Scene";
import { useI18n } from "../i18n/I18n";
import { FocusSection } from "./FocusSection";

interface NarrationPanelProps {
  readonly session: CourseSession;
  readonly step: SceneStep;
  readonly language: ProgrammingLanguageId;
}

export function NarrationPanel({ session, step, language }: NarrationPanelProps): ReactNode {
  const { locale, t } = useI18n();
  const concept =
    step.concept === null
      ? undefined
      : allConcepts(session.syllabus).find((candidate) => candidate.id === step.concept);
  const lines = step.dialogue === null ? [] : session.index.pack.dialogues[step.dialogue];
  const courseModule = session.syllabus.modules.find((candidate) =>
    candidate.concepts.some((moduleConcept) => moduleConcept.id === step.concept),
  );

  return (
    <aside
      className="narration"
      aria-live="polite"
      tabIndex={0}
      aria-label={t("ui.narration.label")}
    >
      {concept !== undefined && (
        <section className="narration__concept">
          {concept.perspective === "functional" && (
            <span className="narration__tag">{t("ui.narration.functionalPerspective")}</span>
          )}
          <h2>{t(`course.concepts.${concept.id}.title`)}</h2>
          <p>{t(`course.concepts.${concept.id}.summary`)}</p>
        </section>
      )}
      {step.focus !== undefined && (
        <FocusSection session={session} focus={step.focus} language={language} />
      )}
      {lines.length > 0 && (
        <ul className="dialogue">
          {lines.map((line, position) => {
            const expert = session.index.experts.get(line.speaker);
            return (
              <li className="dialogue__line" key={`${step.id}-${position}`}>
                <div>
                  <div className="dialogue__speaker">
                    <span className="dialogue__tag">{expert?.name ?? line.speaker}</span>
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
      )}
      {courseModule !== undefined && <Sources references={courseModule.references} />}
    </aside>
  );
}

function Sources({ references }: { readonly references: CourseModule["references"] }): ReactNode {
  const { t } = useI18n();
  return (
    <details className="sources">
      <summary className="sources__title">{t("ui.narration.sources")}</summary>
      <ul className="sources__list">
        {references.map((reference) => (
          <li key={reference.source}>
            <cite>{t(`common.source.${reference.source}`)}</cite>
            {reference.chapters.length > 0 &&
              `, ${t("ui.narration.chapters", { chapters: reference.chapters.join(", ") })}`}
          </li>
        ))}
      </ul>
      <p className="sources__note">{t("ui.narration.sourcesNote")}</p>
    </details>
  );
}
