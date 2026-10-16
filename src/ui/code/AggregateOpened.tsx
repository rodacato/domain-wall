import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { CourseSession } from "../../application/CourseSession";
import { outlineAggregate } from "../../domain/pack/aggregateOutline";
import { useI18n } from "../i18n/I18n";

interface AggregateOpenedProps {
  readonly session: CourseSession;
  readonly aggregate: string;
}

/** The yellow note opened up: the states it moves through, what moves it, what it checks and what it announces. */
export function AggregateOpened({ session, aggregate }: AggregateOpenedProps): ReactNode {
  const { locale, t } = useI18n();
  const outline = outlineAggregate(session.index, aggregate);
  const pack = session.index.aggregates.get(aggregate);
  if (outline === undefined || pack === undefined) return null;

  const stateLabel = (state: string): string =>
    pack.states.find((candidate) => candidate.codeName === state)?.label[locale] ?? state;
  const ruleLabel = (rule: string): string =>
    pack.rules.find((candidate) => candidate.codeName === rule)?.label[locale] ?? rule;
  const commandLabel = (command: string): string =>
    session.index.commands.get(command)?.label[locale] ?? command;
  const eventLabel = (event: string): string =>
    session.index.events.get(event)?.label[locale] ?? event;
  const terminal = new Set(outline.states.filter((state) => state.terminal).map((s) => s.codeName));

  return (
    <div className="opened">
      <h2 className="opened__title">
        {t("ui.aggregate.title", { aggregate: pack.label[locale] })}
      </h2>

      {outline.invariants.length > 0 && (
        <section className="opened__invariants">
          <h3>{t("ui.aggregate.invariants")}</h3>
          <ul>
            {outline.invariants.map((rule) => (
              <li key={rule} className="mini mini--rule">
                {ruleLabel(rule)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <h3 className="opened__heading">{t("ui.aggregate.transitions")}</h3>
      <ol className="opened__transitions">
        {outline.transitions.map((transition, position) => (
          <motion.li
            key={`${transition.command}-${position}`}
            className="transition"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: position * 0.07, type: "spring", stiffness: 180, damping: 18 }}
          >
            <span className="transition__from">
              {transition.from.map((state) => (
                <span key={state} className="mini mini--state">
                  {stateLabel(state)}
                  {state === outline.initialState && <small>{t("ui.aggregate.start")}</small>}
                </span>
              ))}
            </span>
            <span className="transition__arrow" aria-hidden="true">
              →
            </span>
            <span className="mini mini--command">{commandLabel(transition.command)}</span>
            <span className="transition__arrow" aria-hidden="true">
              →
            </span>
            <span className="mini mini--state">
              {stateLabel(transition.to)}
              {terminal.has(transition.to) && <small>{t("ui.aggregate.end")}</small>}
            </span>
            {transition.guards.length > 0 && (
              <span className="transition__extra">
                <em>{t("ui.aggregate.checks")}</em>
                {transition.guards.map((rule) => (
                  <span key={rule} className="mini mini--rule">
                    {ruleLabel(rule)}
                  </span>
                ))}
              </span>
            )}
            <span className="transition__extra">
              <em>{t("ui.aggregate.announces")}</em>
              {transition.emits.map((event) => (
                <span key={event} className="mini mini--event">
                  {eventLabel(event)}
                </span>
              ))}
            </span>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
