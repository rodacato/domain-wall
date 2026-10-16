import type { ReactNode } from "react";
import type { CourseSession } from "../../application/CourseSession";
import type { LocaleCode } from "../../domain/locale/LocaleRegistry";
import type { ProgrammingLanguageId } from "../../domain/language/ProgrammingLanguage";
import { labelOfAnchor, parseAnchorRef } from "../../domain/pack/anchorRef";
import { labelOfConcept } from "../../domain/pack/conceptLabels";
import { patternExamples } from "../../domain/pack/relations";
import type { NarrationFocus } from "../../domain/wall/Scene";
import { useI18n } from "../i18n/I18n";
import { PatternDiagram } from "./PatternDiagram";

interface FocusSectionProps {
  readonly session: CourseSession;
  readonly focus: NarrationFocus;
  readonly language: ProgrammingLanguageId;
}

/** Pack text and pictures that go with a step: why a zone is what it is, how a pattern looks, what a change says. */
export function FocusSection({ session, focus, language }: FocusSectionProps): ReactNode {
  const { locale, t, has } = useI18n();
  const { index } = session;
  const nameOf = (codeName: string): string =>
    labelOfConcept(index, codeName)?.[locale] ?? codeName;

  switch (focus.kind) {
    case "zone": {
      const contexts = index.pack.contexts.filter(
        (context) => context.subdomain.type === focus.zone,
      );
      return (
        <section className="focus">
          <h3 className="focus__title">{t(`ui.zone.${focus.zone}.title`)}</h3>
          <p className="focus__advice">{t(`ui.zone.${focus.zone}.advice`)}</p>
          <ul className="focus__list">
            {contexts.map((context) => (
              <li key={context.codeName}>
                <strong>{context.label[locale]}</strong>
                <span>
                  {" "}
                  {t("ui.zone.why")}: {context.subdomain.rationale[locale]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      );
    }
    case "pattern": {
      const examples = patternExamples(index, focus.pattern);
      return (
        <section className="focus">
          <PatternDiagram pattern={focus.pattern} />
          <h3 className="focus__title">{t(`ui.pattern.${focus.pattern}.name`)}</h3>
          {examples.length === 0 ? (
            <p className="focus__advice">{t("ui.pattern.notInThisBusiness")}</p>
          ) : (
            <>
              <p className="focus__advice">{t("ui.pattern.inThisBusiness")}</p>
              <ul className="focus__list">
                {examples.map((example) => (
                  <li key={`${example.from}>${example.to}`}>
                    <strong>
                      {nameOf(example.from)} → {nameOf(example.to)}
                    </strong>
                    <span> {example.description[locale]}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      );
    }
    case "lookAt": {
      const subject = subjectLabel(session, focus.subject, locale);
      const languageKey = `ui.lookAt.${focus.note}.${language}`;
      return (
        <section className="focus">
          <h3 className="focus__title">{t("ui.lookAt.title")}</h3>
          <p className="focus__advice">{t(`ui.lookAt.${focus.note}.general`, { subject })}</p>
          {has(languageKey) && (
            <p className="focus__language">
              <span className="narration__tag">{t(`common.programmingLanguage.${language}`)}</span>{" "}
              {t(languageKey, { subject })}
            </p>
          )}
        </section>
      );
    }
    case "changeStory":
      return (
        <section className="focus">
          <h3 className="focus__title">{t("ui.impact.story")}</h3>
          <p className="focus__story">{index.pack.changeScenarios[focus.scenario].story[locale]}</p>
        </section>
      );
  }
}

function subjectLabel(session: CourseSession, subject: string | null, locale: LocaleCode): string {
  if (subject === null) return "";
  const parsed = parseAnchorRef(subject);
  const named =
    labelOfAnchor(session.index, subject) ??
    (parsed?.aggregate === null || parsed === undefined
      ? undefined
      : session.index.aggregates.get(parsed.aggregate)?.label);
  return named?.[locale] ?? subject;
}
