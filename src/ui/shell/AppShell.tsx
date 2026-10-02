import { useEffect, type ReactNode } from "react";
import type { CourseSession } from "../../application/CourseSession";
import { SUPPORTED_LOCALES, type LocaleCode } from "../../domain/locale/LocaleRegistry";
import { useI18n } from "../i18n/I18n";
import { NarrationPanel } from "../narration/NarrationPanel";
import { WallView } from "../wall/WallView";
import { useScenePlayer } from "./useScenePlayer";

interface AppShellProps {
  readonly session: CourseSession;
}

const LOCALE_NAMES: Readonly<Record<LocaleCode, string>> = {
  "es-MX": "Español (México)",
  en: "English",
};

export function AppShell({ session }: AppShellProps): ReactNode {
  const { locale, setLocale, t } = useI18n();
  const player = useScenePlayer(session.scenes);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <div className="app">
      <header className="app__header">
        <span className="app__brand">{t("common.app.name")}</span>
        <span className="app__tagline">{t("common.app.tagline")}</span>
        <span className="app__spacer" />
        <span className="app__business">{session.index.pack.business.name[locale]}</span>
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
      </header>

      <nav className="rail" aria-label={t("ui.rail.title")}>
        <h2 className="rail__title">{t("ui.rail.title")}</h2>
        {session.syllabus.modules.map((courseModule) => {
          const scene = session.scenes.find((candidate) => candidate.module === courseModule.id);
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
              {scene === undefined && <span className="rail__soon">{t("ui.rail.soon")}</span>}
            </button>
          );
        })}
      </nav>

      <main className="stage">
        {player.wall !== undefined && <WallView session={session} state={player.wall} />}
      </main>
      {player.step !== undefined && <NarrationPanel session={session} step={player.step} />}

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
