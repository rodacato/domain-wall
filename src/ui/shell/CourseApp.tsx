import { MotionConfig } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CodeRunner, SyntaxChecker } from "../../application/codeExercise";
import { startCourse, type CourseSharedInput } from "../../application/CourseSession";
import { conceptCompletedMessage, type HostBridge, type HostMessage } from "../../application/host";
import type { LearnerState, LearnerStorage } from "../../application/learnerState";
import { packFor, packIdOf, type PackLibrary } from "../../application/packLibrary";
import type { ConceptId } from "../../domain/course/ConceptId";
import type { LocaleCode } from "../../domain/locale/LocaleRegistry";
import type { LearnerPreferences } from "../../domain/progress/LearnerPreferences";
import { RunnerProvider } from "../exercises/RunnerContext";
import { SyntaxCheckerProvider } from "../exercises/SyntaxCheckerContext";
import { I18nProvider } from "../i18n/I18n";
import { Onboarding } from "../onboarding/Onboarding";
import { AppShell } from "./AppShell";
import { useHost } from "./useHost";
import { useLearner } from "./useLearner";
import { applyThemeTokens, useTheme } from "./useTheme";

interface CourseAppProps {
  readonly library: PackLibrary;
  readonly shared: CourseSharedInput;
  readonly storage: LearnerStorage;
  readonly syntaxChecker: SyntaxChecker;
  /** The channel to the embedding page; one that does nothing when the course runs on its own. */
  readonly bridge: HostBridge;
  /** Runs tests through the host; used only once the host says it can. */
  readonly hostRunner: CodeRunner;
  readonly initial: LearnerState;
}

/** The whole course: onboarding for a first-time learner, the wall for everyone after. */
export function CourseApp({
  library,
  shared,
  storage,
  syntaxChecker,
  bridge,
  hostRunner,
  initial,
}: CourseAppProps): ReactNode {
  const learner = useLearner(storage, shared.syllabus, initial);
  const [choosing, setChoosing] = useState(!initial.onboarded);
  const [theme, setTheme] = useTheme();
  const { preferences, choose, progress } = learner;
  const pack = packFor(library, preferences.pack);
  const session = useMemo(() => startCourse({ pack, ...shared }), [pack, shared]);

  const changeLocale = useCallback(
    (locale: LocaleCode) => {
      choose({ ...preferences, locale });
    },
    [choose, preferences],
  );

  const onHostMessage = useCallback(
    (message: HostMessage) => {
      switch (message.type) {
        case "host:init": {
          const { locale, programmingLanguage, industry, theme: asked } = message.payload;
          const preset = library.presets.find((candidate) => candidate.packId === industry);
          const next: LearnerPreferences = {
            ...preferences,
            ...(locale === undefined ? {} : { locale }),
            ...(programmingLanguage === undefined ? {} : { programmingLanguage }),
            ...(industry === undefined
              ? {}
              : {
                  pack:
                    preset === undefined
                      ? { kind: "default" }
                      : { kind: "preset", packId: preset.packId },
                }),
          };
          choose(next);
          if (locale !== undefined && programmingLanguage !== undefined) setChoosing(false);
          if (asked !== undefined) {
            setTheme(asked.mode);
            applyThemeTokens(asked.tokens ?? {});
          }
          break;
        }
        case "host:setLocale":
          choose({ ...preferences, locale: message.payload.locale });
          break;
        case "host:setTheme":
          setTheme(message.payload.mode);
          applyThemeTokens(message.payload.tokens ?? {});
          break;
        case "host:runResult":
        case "host:llmResult":
        case "host:llmFailed":
          break;
      }
    },
    [library, preferences, choose, setTheme],
  );
  const capabilities = useHost(bridge, onHostMessage);

  const reported = useRef(new Set<string>(Object.keys(initial.progress.completions)));
  useEffect(() => {
    for (const conceptId of Object.keys(progress.completions)) {
      if (reported.current.has(conceptId)) continue;
      reported.current.add(conceptId);
      bridge.send(
        conceptCompletedMessage(
          shared.syllabus,
          conceptId as ConceptId,
          preferences.programmingLanguage,
          packIdOf(preferences.pack),
        ),
      );
    }
  }, [bridge, progress, shared.syllabus, preferences.programmingLanguage, preferences.pack]);

  return (
    <I18nProvider
      catalogs={session.catalogs}
      locale={preferences.locale}
      onLocaleChange={changeLocale}
    >
      <MotionConfig reducedMotion="user">
        <SyntaxCheckerProvider checker={syntaxChecker}>
          <RunnerProvider runner={capabilities.remoteExecution ? hostRunner : null}>
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
                theme={theme}
                onThemeChange={setTheme}
                onReopenOnboarding={() => {
                  setChoosing(true);
                }}
              />
            )}
          </RunnerProvider>
        </SyntaxCheckerProvider>
      </MotionConfig>
    </I18nProvider>
  );
}
