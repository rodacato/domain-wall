import { motion } from "motion/react";
import { useMemo, useState, type ReactNode } from "react";
import type { CourseSession } from "../../application/CourseSession";
import { attacksOn, type Attack } from "../../domain/pack/interpreter";
import { useI18n } from "../i18n/I18n";

interface InvariantBreakerProps {
  readonly session: CourseSession;
  readonly aggregate: string;
  /** The anchor reference of the rule that refused the attack, or null when the learner starts over. */
  readonly onRefused: (anchorRef: string | null) => void;
}

function anchorOf(aggregate: string, attack: Attack): string {
  return `${aggregate}.${attack.phase === "invariant" ? "invariant" : "rule"}.${attack.rule}`;
}

/** Module 7: commands that try to break a rule, played by the reference interpreter, bounced back by the aggregate. */
export function InvariantBreaker({
  session,
  aggregate,
  onRefused,
}: InvariantBreakerProps): ReactNode {
  const { locale, t } = useI18n();
  const [tried, setTried] = useState<Attack | null>(null);
  const attacks = useMemo(() => attacksOn(session.index, aggregate), [session.index, aggregate]);
  const pack = session.index.aggregates.get(aggregate);
  if (pack === undefined) return null;

  const ruleOf = (name: string) => pack.rules.find((rule) => rule.codeName === name);
  const commandLabel = (command: string): string =>
    session.index.commands.get(command)?.label[locale] ?? command;

  return (
    <section className="breaker" aria-live="polite">
      <header className="breaker__header">
        <h3>{t("ui.breaker.title", { aggregate: pack.label[locale] })}</h3>
        <p>{t("ui.breaker.hint")}</p>
      </header>
      <div className="breaker__body">
        <ul className="breaker__attacks">
          {attacks.map((attack) => (
            <li key={attack.rule}>
              <button
                className="breaker__attack"
                aria-pressed={tried?.rule === attack.rule}
                onClick={() => {
                  setTried(attack);
                  onRefused(anchorOf(aggregate, attack));
                }}
              >
                {t("ui.breaker.attack", {
                  command: commandLabel(attack.command),
                  rule: ruleOf(attack.rule)?.label[locale] ?? attack.rule,
                })}
              </button>
            </li>
          ))}
        </ul>

        {tried !== null && (
          <div className="breaker__arena" key={tried.rule}>
            <motion.span
              className="mini mini--command breaker__command"
              initial={{ x: -140, opacity: 0 }}
              animate={{ x: [-140, 0, -46, -18, -30], opacity: 1, rotate: [0, 0, -7, 3, 0] }}
              transition={{ duration: 0.9, times: [0, 0.4, 0.6, 0.8, 1], ease: "easeOut" }}
            >
              {commandLabel(tried.command)}
            </motion.span>
            <span className="breaker__wall" aria-hidden="true" />
            <motion.div
              className="breaker__answer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
            >
              <strong>{t("ui.breaker.refused")}</strong>
              <span>{ruleOf(tried.rule)?.message[locale]}</span>
              <small>
                {t(tried.phase === "guard" ? "ui.breaker.guard" : "ui.breaker.invariant")}
              </small>
            </motion.div>
          </div>
        )}

        {tried !== null && (
          <button
            className="breaker__reset"
            onClick={() => {
              setTried(null);
              onRefused(null);
            }}
          >
            {t("ui.breaker.reset")}
          </button>
        )}
      </div>
    </section>
  );
}
