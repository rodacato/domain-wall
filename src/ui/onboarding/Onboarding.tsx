import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import type { CourseSession } from "../../application/CourseSession";
import {
  PROGRAMMING_LANGUAGES,
  type ProgrammingLanguageId,
} from "../../domain/language/ProgrammingLanguage";
import { SUPPORTED_LOCALES, type LocaleCode } from "../../domain/locale/LocaleRegistry";
import type { LearnerPreferences } from "../../domain/progress/LearnerPreferences";
import { useI18n } from "../i18n/I18n";
import "./onboarding.css";

const STEP_COUNT = 3;
const LOCALE_NAMES: Readonly<Record<LocaleCode, string>> = {
  "es-MX": "Español (México)",
  en: "English",
};

interface OnboardingProps {
  readonly session: CourseSession;
  readonly initial: LearnerPreferences;
  readonly onFinish: (preferences: LearnerPreferences) => void;
}

/** Three choices made on a blank wall: the language of the course, the language of the code, the business. */
export function Onboarding({ session, initial, onFinish }: OnboardingProps): ReactNode {
  const { setLocale, t } = useI18n();
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState(initial);
  const [previewed, setPreviewed] = useState<ProgrammingLanguageId>(initial.programmingLanguage);
  const business = session.index.pack.business;
  const { locale } = choice;

  const chooseLocale = (next: LocaleCode): void => {
    setChoice({ ...choice, locale: next });
    setLocale(next);
  };

  return (
    <div className="onboarding">
      <motion.section
        className="onboarding__board"
        initial={{ y: -80, opacity: 0, rotate: -2 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 110, damping: 15 }}
      >
        <p className="onboarding__step">
          {t("ui.onboarding.step", { current: step + 1, total: STEP_COUNT })}
        </p>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && (
              <>
                <h1 className="onboarding__title">{t("ui.onboarding.language.title")}</h1>
                <p className="onboarding__hint">{t("ui.onboarding.language.hint")}</p>
                <div className="onboarding__chips">
                  {SUPPORTED_LOCALES.map((code) => (
                    <button
                      key={code}
                      className="chip"
                      aria-pressed={code === locale}
                      onClick={() => {
                        chooseLocale(code);
                      }}
                    >
                      {LOCALE_NAMES[code]}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h1 className="onboarding__title">
                  {t("ui.onboarding.programmingLanguage.title")}
                </h1>
                <p className="onboarding__hint">{t("ui.onboarding.programmingLanguage.hint")}</p>
                <div className="onboarding__languages">
                  <div className="onboarding__cards">
                    {PROGRAMMING_LANGUAGES.map((language) => (
                      <button
                        key={language}
                        className="card"
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
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.pre
                      className="onboarding__code"
                      key={previewed}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                    >
                      <code>{session.languageSamples[previewed]}</code>
                    </motion.pre>
                  </AnimatePresence>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h1 className="onboarding__title">{t("ui.onboarding.industry.title")}</h1>
                <p className="onboarding__hint">{t("ui.onboarding.industry.hint")}</p>
                <div className="onboarding__industries">
                  <button
                    className="card card--wide"
                    aria-pressed={choice.pack.kind === "default"}
                    onClick={() => {
                      setChoice({ ...choice, pack: { kind: "default" } });
                    }}
                  >
                    <span className="card__title">{business.name[locale]}</span>
                    <span className="card__text">{business.description[locale]}</span>
                    <span className="card__badge">{t("ui.onboarding.industry.defaultBadge")}</span>
                  </button>
                  <button className="card card--wide" disabled>
                    <span className="card__title">{t("ui.onboarding.industry.presets")}</span>
                    <span className="card__badge">{t("ui.onboarding.industry.soon")}</span>
                  </button>
                  <button className="card card--wide" disabled>
                    <span className="card__title">{t("ui.onboarding.industry.describe")}</span>
                    <span className="card__text">{t("ui.onboarding.industry.describeHint")}</span>
                    <span className="card__badge">{t("ui.onboarding.industry.soon")}</span>
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="onboarding__actions">
          <button
            className="player__button"
            disabled={step === 0}
            onClick={() => {
              setStep(step - 1);
            }}
          >
            {t("ui.onboarding.back")}
          </button>
          {step < STEP_COUNT - 1 ? (
            <button
              className="player__button player__button--primary"
              onClick={() => {
                setStep(step + 1);
              }}
            >
              {t("ui.onboarding.next")}
            </button>
          ) : (
            <button
              className="player__button player__button--primary"
              onClick={() => {
                onFinish(choice);
              }}
            >
              {t("ui.onboarding.start")}
            </button>
          )}
        </div>
      </motion.section>
    </div>
  );
}
