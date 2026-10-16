import { useEffect, type ReactNode } from "react";
import type { CourseSession } from "../../application/CourseSession";
import {
  PROGRAMMING_LANGUAGES,
  type ProgrammingLanguageId,
} from "../../domain/language/ProgrammingLanguage";
import { SUPPORTED_LOCALES, type LocaleCode } from "../../domain/locale/LocaleRegistry";
import { isExerciseCompleted, moduleCompletion } from "../../domain/progress/Progress";
import { useI18n } from "../i18n/I18n";
import { NarrationPanel } from "../narration/NarrationPanel";
import { WallView } from "../wall/WallView";
import type { Learner } from "./useLearner";
import { useScenePlayer } from "./useScenePlayer";

interface AppShellProps {
  readonly session: CourseSession;
  readonly learner: Learner;
  readonly onReopenOnboarding: () => void;
}

const LOCALE_NAMES: Readonly<Record<LocaleCode, string>> = {
  "es-MX": "Español (México)",
  en: "English",
};

export function AppShell({ session, learner, onReopenOnboarding }: AppShellProps): ReactNode {
  const { locale, setLocale, t } = useI18n();
  const player = useScenePlayer(session.scenes);
  const { reach } = learner;
  const conceptInView = player.step?.concept ?? null;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (conceptInView !== null) reach(conceptInView);
  }, [conceptInView, reach]);

  return (
    <div className="app">
      <header className="app__header">
        <span className="app__brand">{t("common.app.name")}</span>
        <span className="app__tagline">{t("common.app.tagline")}</span>
        <span className="app__spacer" />
        <button
          className="app__business"
          onClick={onReopenOnboarding}
          title={t("ui.preferences.open")}
        >
          {session.index.pack.business.name[locale]}
        </button>
        <label className="app__language">
          {t("ui.language.label")}
          <select
            value={locale}
            onChange={(event) => {
              setLocale(event.target.value as LocaleCode);
            }}
          >
            {SUPPORTED_LOCALES.map((code) => (
              <option key={code} value={code}>
                {LOCALE_NAMES[code]}
              </option>
            ))}
          </select>
        </label>
        <label className="app__language">
          {t("ui.language.code")}
          <select
            value={learner.preferences.programmingLanguage}
            onChange={(event) => {
              learner.choose({
                ...learner.preferences,
                programmingLanguage: event.target.value as ProgrammingLanguageId,
              });
            }}
          >
            {PROGRAMMING_LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {t(`common.programmingLanguage.${language}`)}
              </option>
            ))}
          </select>
        </label>
      </header>

      <nav className="rail" aria-label={t("ui.rail.title")}>
        <h2 className="rail__title">{t("ui.rail.title")}</h2>
        {session.syllabus.modules.map((courseModule) => {
          const scene = session.scenes.find((candidate) => candidate.module === courseModule.id);
          const completion = moduleCompletion(learner.progress, session.syllabus, courseModule.id);
          return (
            <button
              key={courseModule.id}
              className="rail__item"
              disabled={scene === undefined}
              aria-current={scene !== undefined && scene.id === player.scene?.id}
              onClick={() => {
                if (scene !== undefined) player.selectScene(scene.id);
              }}
            >
              <span className="rail__number">{courseModule.number}</span>
              <span>{t(`course.modules.${courseModule.id}.title`)}</span>
              {scene === undefined ? (
                <span className="rail__soon">{t("ui.rail.soon")}</span>
              ) : (
                <span className="rail__soon">
                  {t("ui.rail.progress", {
                    completed: completion.completed,
                    total: completion.total,
                  })}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <main className="stage">
        {player.wall !== undefined && (
          <WallView
            session={session}
            state={player.wall}
            language={learner.preferences.programmingLanguage}
            isSolved={(kind) => isExerciseCompleted(learner.progress, kind)}
            onSolve={learner.solve}
          />
        )}
      </main>
      {player.step !== undefined && (
        <NarrationPanel
          session={session}
          step={player.step}
          language={learner.preferences.programmingLanguage}
        />
      )}

      <footer className="player">
        <button
          className="player__button"
          onClick={player.previous}
          disabled={player.stepIndex === 0}
        >
          ← {t("ui.player.previous")}
        </button>
        <input
          className="player__range"
          type="range"
          min={0}
          max={Math.max(0, player.stepCount - 1)}
          value={player.stepIndex}
          aria-label={t("ui.player.position", {
            current: player.stepIndex + 1,
            total: player.stepCount,
          })}
          onChange={(event) => {
            player.goTo(Number(event.target.value));
          }}
        />
        <span className="player__position">
          {t("ui.player.position", { current: player.stepIndex + 1, total: player.stepCount })}
        </span>
        <button
          className="player__button player__button--primary"
          onClick={player.next}
          disabled={player.stepIndex >= player.stepCount - 1}
        >
          {t("ui.player.next")} →
        </button>
      </footer>
    </div>
  );
}
