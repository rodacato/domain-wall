import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import type { CourseSession } from "../../application/CourseSession";
import type { GenerationServices } from "../../application/generationServices";
import type { GeneratedPack, PackLibrary } from "../../application/packLibrary";
import { GenerateBusiness } from "../generation/GenerateBusiness";
import {
  PROGRAMMING_LANGUAGES,
  type ProgrammingLanguageId,
} from "../../domain/language/ProgrammingLanguage";
import { SUPPORTED_LOCALES, type LocaleCode } from "../../domain/locale/LocaleRegistry";
import type { LearnerPreferences, PackSelection } from "../../domain/progress/LearnerPreferences";
import { useI18n } from "../i18n/I18n";
import "./onboarding.css";

const LOCALE_NAMES: Readonly<Record<LocaleCode, string>> = {
  "es-MX": "Español (México)",
  en: "English",
};

interface OnboardingProps {
  readonly session: CourseSession;
  readonly library: PackLibrary;
  readonly generation: GenerationServices;
  /** Called when a business has been generated and checked, before the learner starts with it. */
  readonly onGenerated: (entry: GeneratedPack) => void;
  readonly initial: LearnerPreferences;
  readonly onFinish: (preferences: LearnerPreferences) => void;
}

interface BusinessOption {
  readonly id: string;
  readonly choice: PackSelection;
  readonly name: string;
  readonly description: string;
  readonly badge: string | null;
}

function samePack(left: PackSelection, right: PackSelection): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** The first screen is the wall itself: what the course is, who it is for, and three choices pinned as notes. */
export function Onboarding({
  session,
  library,
  generation,
  onGenerated,
  initial,
  onFinish,
}: OnboardingProps): ReactNode {
  const { setLocale, t } = useI18n();
  const [choice, setChoice] = useState(initial);
  const [describing, setDescribing] = useState(false);
  const [previewed, setPreviewed] = useState<ProgrammingLanguageId>(initial.programmingLanguage);
  const { locale } = choice;

  const businesses: readonly BusinessOption[] = [
    {
      id: "default",
      choice: { kind: "default" },
      name: library.defaultPack.business.name[locale],
      description: library.defaultPack.business.description[locale],
      badge: t("ui.onboarding.industry.defaultBadge"),
    },
    ...library.presets.map((preset) => ({
      id: preset.packId,
      choice: { kind: "preset", packId: preset.packId } as const,
      name: preset.pack.business.name[locale],
      description: preset.pack.business.description[locale],
      badge: null,
    })),
    ...library.generated.map((entry) => ({
      id: entry.key,
      choice: { kind: "generated", packKey: entry.key } as const,
      name: entry.pack.business.name[locale],
      description: entry.description,
      badge: t("ui.onboarding.industry.generatedBadge"),
    })),
  ];
  const chosenBusiness = businesses.find((option) => samePack(option.choice, choice.pack));

  return (
    <div className="cover">
      <header className="cover__masthead tape">
        <span className="app__brand">{t("common.app.name")}</span>
        <span className="app__tagline">{t("common.app.tagline")}</span>
      </header>

      <motion.main
        className="cover__roll"
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
      >
        <div className="cover__intro">
          <h1 className="cover__title">{t("ui.onboarding.cover.title")}</h1>
          <p className="cover__pitch">{t("ui.onboarding.cover.pitch")}</p>
        </div>
        <aside className="cover__who">
          <h2>{t("ui.onboarding.cover.whoTitle")}</h2>
          <p>{t("ui.onboarding.cover.who")}</p>
        </aside>

        <div className="cover__choices">
          <section className="cover__group" aria-labelledby="cover-language">
            <h2 id="cover-language">{t("ui.onboarding.language.title")}</h2>
            <div className="cover__notes">
              {SUPPORTED_LOCALES.map((code) => (
                <button
                  key={code}
                  className="pick pick--actor"
                  aria-pressed={code === locale}
                  onClick={() => {
                    setChoice({ ...choice, locale: code });
                    setLocale(code);
                  }}
                >
                  {LOCALE_NAMES[code]}
                </button>
              ))}
            </div>
          </section>

          <section className="cover__group" aria-labelledby="cover-code">
            <h2 id="cover-code">{t("ui.onboarding.programmingLanguage.title")}</h2>
            <div className="cover__notes">
              {PROGRAMMING_LANGUAGES.map((language) => (
                <button
                  key={language}
                  className="pick pick--command pick--code"
                  aria-pressed={language === choice.programmingLanguage}
                  onMouseEnter={() => {
                    setPreviewed(language);
                  }}
                  onFocus={() => {
                    setPreviewed(language);
                  }}
                  onClick={() => {
                    setChoice({ ...choice, programmingLanguage: language });
                    setPreviewed(language);
                  }}
                >
                  {t(`common.programmingLanguage.${language}`)}
                </button>
              ))}
            </div>
            <p className="cover__hint">{t("ui.onboarding.programmingLanguage.hint")}</p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.pre
                className="cover__code"
                key={previewed}
                tabIndex={0}
                aria-label={t(`common.programmingLanguage.${previewed}`)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <code>{session.languageSamples[previewed]}</code>
              </motion.pre>
            </AnimatePresence>
          </section>

          <section className="cover__group cover__group--business" aria-labelledby="cover-business">
            <h2 id="cover-business">{t("ui.onboarding.industry.title")}</h2>
            <div className="cover__notes">
              {businesses.map((option) => (
                <button
                  key={option.id}
                  className="pick pick--aggregate"
                  aria-pressed={samePack(option.choice, choice.pack)}
                  onClick={() => {
                    setChoice({ ...choice, pack: option.choice });
                  }}
                >
                  {option.name}
                </button>
              ))}
              <button
                className="pick pick--hotspot"
                aria-expanded={describing}
                onClick={() => {
                  setDescribing(!describing);
                }}
              >
                {t("ui.onboarding.industry.describe")}
              </button>
            </div>
            {chosenBusiness !== undefined && (
              <p className="cover__business">
                {chosenBusiness.badge !== null && (
                  <span className="cover__badge">{chosenBusiness.badge}</span>
                )}
                {chosenBusiness.description}
              </p>
            )}
          </section>
        </div>

        {describing && (
          <section className="cover__describe">
            <h2>{t("ui.onboarding.industry.describe")}</h2>
            <p className="cover__hint">{t("ui.onboarding.industry.describeHint")}</p>
            <GenerateBusiness
              services={generation}
              onReady={(entry) => {
                onGenerated(entry);
                setChoice({ ...choice, pack: { kind: "generated", packKey: entry.key } });
                setDescribing(false);
              }}
            />
          </section>
        )}

        <button
          className="cover__start"
          onClick={() => {
            onFinish(choice);
          }}
        >
          <span className="cover__kicker" aria-hidden="true">
            {t("ui.onboarding.cover.startKicker")}
          </span>
          {t("ui.onboarding.start")}
        </button>
      </motion.main>

      <footer className="player cover__ledge">
        <span className="player__position">{t("ui.onboarding.cover.later")}</span>
      </footer>
    </div>
  );
}
