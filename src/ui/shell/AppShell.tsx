import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CourseSession } from "../../application/CourseSession";
import {
  PROGRAMMING_LANGUAGES,
  type ProgrammingLanguageId,
} from "../../domain/language/ProgrammingLanguage";
import { SUPPORTED_LOCALES, type LocaleCode } from "../../domain/locale/LocaleRegistry";
import { exerciseEvidence, moduleCompletion } from "../../domain/progress/Progress";
import { useI18n } from "../i18n/I18n";
import { NarrationPanel } from "../narration/NarrationPanel";
import { Tour } from "../tour/Tour";
import { opensByItself, rememberTourSeen, tourSeen } from "../tour/tourVisibility";
import { WallView } from "../wall/WallView";
import type { Learner } from "./useLearner";
import { THEME_CHOICES, type ThemeChoice } from "./useTheme";
import { useScenePlayer } from "./useScenePlayer";

interface AppShellProps {
  readonly session: CourseSession;
  readonly learner: Learner;
  readonly onReopenOnboarding: () => void;
  readonly theme: ThemeChoice;
  readonly onThemeChange: (theme: ThemeChoice) => void;
}

const LOCALE_NAMES: Readonly<Record<LocaleCode, string>> = {
  "es-MX": "Español (México)",
  en: "English",
};

export function AppShell({
  session,
  learner,
  onReopenOnboarding,
  theme,
  onThemeChange,
}: AppShellProps): ReactNode {
  const { locale, setLocale, t } = useI18n();
  const player = useScenePlayer(session.scenes);
  const { reach } = learner;
  const conceptInView = player.step?.concept ?? null;
  const [touring, setTouring] = useState(() => opensByItself(window.location.search, tourSeen()));
  const tourButton = useRef<HTMLButtonElement>(null);
  const atLastStep = player.stepIndex >= player.stepCount - 1;
  const nextModule = session.syllabus.modules.find(
    (candidate) => candidate.id === player.nextScene?.module,
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (conceptInView !== null) reach(conceptInView);
  }, [conceptInView, reach]);

  return (
    <div className="app">
      <header className="app__header">
        <span className="app__title tape">
          <span className="app__brand">{t("common.app.name")}</span>
          <span className="app__tagline">{t("common.app.tagline")}</span>
        </span>
        <span className="app__spacer" />
        <button
          className="app__business"
          onClick={onReopenOnboarding}
          title={t("ui.preferences.open")}
        >
          <span className="app__business-top">{t("ui.preferences.modeling")}</span>
          <span className="app__business-name">{session.index.pack.business.name[locale]}</span>
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
          {t("ui.theme.label")}
          <select
            value={theme}
            onChange={(event) => {
              onThemeChange(event.target.value as ThemeChoice);
            }}
          >
            {THEME_CHOICES.map((choice) => (
              <option key={choice} value={choice}>
                {t(`ui.theme.${choice}`)}
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
        <button
          ref={tourButton}
          className="app__tour"
          aria-label={t("ui.tour.open")}
          title={t("ui.tour.open")}
          onClick={() => {
            setTouring(true);
          }}
        >
          ?
        </button>
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
                <span
                  className="rail__soon"
                  title={t("ui.rail.progressHint", {
                    completed: completion.completed,
                    total: completion.total,
                  })}
                >
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
            evidenceOf={(kind) => exerciseEvidence(learner.progress, kind)}
            onSolve={learner.solve}
          />
        )}
      </main>
      {player.step !== undefined && (
        <NarrationPanel
          session={session}
          step={player.step}
          language={learner.preferences.programmingLanguage}
          courseModule={session.syllabus.modules.find(
            (candidate) => candidate.id === player.scene?.module,
          )}
        />
      )}

      <footer className="player">
        <button
          className="player__button player__button--back"
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
          className="player__button player__button--demo"
          aria-pressed={player.demo}
          onClick={player.toggleDemo}
          title={t("ui.player.demoHint")}
        >
          {player.demo ? `⏸ ${t("ui.player.stopDemo")}` : `▶ ${t("ui.player.demo")}`}
        </button>
        <button
          className={`player__button player__button--primary ${atLastStep && nextModule !== undefined ? "player__button--next-module" : ""}`}
          onClick={player.next}
          disabled={atLastStep && nextModule === undefined}
        >
          {atLastStep && nextModule !== undefined
            ? t("ui.player.nextModule", {
                title: t(`course.modules.${nextModule.id}.title`),
              })
            : t("ui.player.next")}{" "}
          →
        </button>
      </footer>
      {touring && (
        <Tour
          onClose={() => {
            rememberTourSeen();
            setTouring(false);
            tourButton.current?.focus();
          }}
        />
      )}
    </div>
  );
}
