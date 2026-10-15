import { useCallback, useState, type ReactNode } from "react";
import type { CourseSession } from "../../application/CourseSession";
import type { LearnerState, LearnerStorage } from "../../application/learnerState";
import type { LocaleCode } from "../../domain/locale/LocaleRegistry";
import { I18nProvider } from "../i18n/I18n";
import { Onboarding } from "../onboarding/Onboarding";
import { AppShell } from "./AppShell";
import { useLearner } from "./useLearner";

interface CourseAppProps {
  readonly session: CourseSession;
  readonly storage: LearnerStorage;
  readonly initial: LearnerState;
}

/** The whole course: onboarding for a first-time learner, the wall for everyone after. */
export function CourseApp({ session, storage, initial }: CourseAppProps): ReactNode {
  const learner = useLearner(storage, session.syllabus, initial);
  const [choosing, setChoosing] = useState(!initial.onboarded);
  const { preferences, choose } = learner;

  const changeLocale = useCallback(
    (locale: LocaleCode) => {
      choose({ ...preferences, locale });
    },
    [choose, preferences],
  );

  return (
    <I18nProvider
      catalogs={session.catalogs}
      locale={preferences.locale}
      onLocaleChange={changeLocale}
    >
      {choosing ? (
        <Onboarding
          session={session}
          initial={preferences}
          onFinish={(chosen) => {
            choose(chosen);
            setChoosing(false);
          }}
        />
      ) : (
        <AppShell
          session={session}
          learner={learner}
          onReopenOnboarding={() => {
            setChoosing(true);
          }}
        />
      )}
    </I18nProvider>
  );
}
