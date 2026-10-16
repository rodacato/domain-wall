import { MotionConfig } from "motion/react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { startCourse, type CourseSharedInput } from "../../application/CourseSession";
import type { SyntaxChecker } from "../../application/codeExercise";
import { packFor, type PackLibrary } from "../../application/packLibrary";
import type { LearnerState, LearnerStorage } from "../../application/learnerState";
import type { LocaleCode } from "../../domain/locale/LocaleRegistry";
import { SyntaxCheckerProvider } from "../exercises/SyntaxCheckerContext";
import { I18nProvider } from "../i18n/I18n";
import { Onboarding } from "../onboarding/Onboarding";
import { AppShell } from "./AppShell";
import { useLearner } from "./useLearner";

interface CourseAppProps {
  readonly library: PackLibrary;
  readonly shared: CourseSharedInput;
  readonly storage: LearnerStorage;
  readonly syntaxChecker: SyntaxChecker;
  readonly initial: LearnerState;
}

/** The whole course: onboarding for a first-time learner, the wall for everyone after. */
export function CourseApp({
  library,
  shared,
  storage,
  syntaxChecker,
  initial,
}: CourseAppProps): ReactNode {
  const learner = useLearner(storage, shared.syllabus, initial);
  const [choosing, setChoosing] = useState(!initial.onboarded);
  const { preferences, choose } = learner;
  const pack = packFor(library, preferences.pack);
  const session = useMemo(() => startCourse({ pack, ...shared }), [pack, shared]);

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
      <MotionConfig reducedMotion="user">
        <SyntaxCheckerProvider checker={syntaxChecker}>
          {choosing ? (
            <Onboarding
              session={session}
              library={library}
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
        </SyntaxCheckerProvider>
      </MotionConfig>
    </I18nProvider>
  );
}
