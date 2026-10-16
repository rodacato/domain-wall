import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { CourseSession } from "../../application/CourseSession";
import type { LocaleCode } from "../../domain/locale/LocaleRegistry";
import { runWorkflow } from "../../domain/pack/interpreter";
import { shapeWorkflow, type ResolvedType } from "../../domain/pack/workflowShape";
import type { PipelineStageState } from "../../domain/wall/PipelineStage";
import { useI18n } from "../i18n/I18n";
import { StageOverlay } from "../wall/StageOverlay";
import "./pipeline.css";

interface PipelineStageProps {
  readonly session: CourseSession;
  readonly pipeline: PipelineStageState;
}

const STEP_MILLISECONDS = 650;

/** The workflow as a railway: each stage turns the data into a new type, and a failure leaves the main track as a value. */
export function PipelineStage({ session, pipeline }: PipelineStageProps): ReactNode {
  if (pipeline.view === "hidden") return null;
  return <Railway key={JSON.stringify(pipeline)} session={session} pipeline={pipeline} />;
}

function Railway({ session, pipeline }: PipelineStageProps): ReactNode {
  const { locale, t } = useI18n();
  const shaped = useMemo(() => shapeWorkflow(session.index), [session.index]);
  const [failures, setFailures] = useState<Readonly<Record<string, string>>>(pipeline.failures);
  const [playId, setPlayId] = useState(0);
  const [ticks, setTicks] = useState(0);
  const reduced = useReducedMotion() ?? false;
  const running = pipeline.view === "run";

  const runs = useMemo(() => runWorkflow(session.index, failures), [session.index, failures]);
  const failedAt = runs.findIndex((run) => run.outcome === "failed");
  const lastReached = failedAt === -1 ? shaped.length : failedAt;
  const progress = !running ? -1 : reduced ? lastReached : Math.min(ticks, lastReached);

  useEffect(() => {
    if (!running || reduced) return;
    const timer = window.setInterval(() => {
      setTicks((current) => (current >= shaped.length ? current : current + 1));
    }, STEP_MILLISECONDS);
    return () => {
      window.clearInterval(timer);
    };
  }, [running, reduced, playId, shaped.length]);

  const replay = (): void => {
    setTicks(0);
    setPlayId((id) => id + 1);
  };

  const first = shaped[0];
  if (first === undefined) return null;
  const types = [first.input, ...shaped.map((entry) => entry.output)];
  const typeLabel = (field: ResolvedType["fields"][number]): string => {
    if (field.type.kind === "primitive") return t(`ui.pipeline.primitive.${field.type.name}`);
    if (field.type.kind === "valueObject")
      return session.index.valueObjects.get(field.type.ref)?.label[locale] ?? field.type.ref;
    return "";
  };
  const interactive = pipeline.interactive && pipeline.view === "run";
  const toggle = (stage: string, error: string): void => {
    setFailures((current) => {
      const rest = Object.fromEntries(Object.entries(current).filter(([name]) => name !== stage));
      return current[stage] === error ? rest : { ...rest, [stage]: error };
    });
    replay();
  };
  const mismatchStage = shaped.find((entry) => entry.stage.kind.type === "callPort");

  return (
    <StageOverlay>
      <h2 className="railway__title">{t(`ui.pipeline.title.${pipeline.view}`)}</h2>
      {interactive && <p className="railway__hint">{t("ui.pipeline.inject")}</p>}

      {pipeline.view === "mismatch" && mismatchStage !== undefined && (
        <p className="railway__mismatch">
          {t("ui.pipeline.mismatch", {
            stage: mismatchStage.stage.label[locale],
            needs: mismatchStage.input.codeName,
            got: first.input.codeName,
          })}
        </p>
      )}
      {failedAt !== -1 && running && progress >= failedAt && (
        <motion.div
          className="railway__failure"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <strong>
            {t("ui.pipeline.failedAt", { stage: shaped[failedAt]?.stage.label[locale] ?? "" })}
          </strong>
          <span>
            {
              shaped[failedAt]?.stage.errors.find(
                (error) => error.codeName === runs[failedAt]?.error,
              )?.message[locale]
            }
          </span>
          <small>{t("ui.pipeline.errorIsValue")}</small>
        </motion.div>
      )}
      {running && (
        <button className="railway__replay" onClick={replay}>
          {t("ui.pipeline.run")}
        </button>
      )}

      <ol className="railway">
        {types.map((type, position) => {
          const entry = shaped[position];
          const reached = running && progress >= position;
          const here = running && progress === position && failedAt !== position - 1;
          const failedHere =
            running && failedAt !== -1 && failedAt === position - 1 && progress >= failedAt;
          return (
            <li key={type.codeName} className="railway__step">
              <motion.div
                className={`type ${reached ? "type--reached" : ""} ${failedHere ? "type--missed" : ""}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: position * 0.08 }}
              >
                <strong className="type__name">{type.codeName}</strong>
                <span className="type__fields">
                  {type.fields.map((field) => (
                    <span
                      key={field.codeName}
                      className={`field ${type.added.includes(field.codeName) && position > 0 ? "field--added" : ""}`}
                    >
                      {field.label[locale]}
                      <small>{typeLabel(field)}</small>
                    </span>
                  ))}
                </span>
                {here && !failedHere && (
                  <motion.span layoutId="token" className="token" aria-hidden="true" />
                )}
              </motion.div>

              {entry !== undefined && position < shaped.length && (
                <StageConnector
                  entry={entry}
                  run={runs[position]}
                  interactive={interactive}
                  failures={failures}
                  onToggle={toggle}
                  highlightMismatch={pipeline.view === "mismatch" && entry === mismatchStage}
                  locale={locale}
                />
              )}
            </li>
          );
        })}
      </ol>
    </StageOverlay>
  );
}

interface StageConnectorProps {
  readonly entry: ReturnType<typeof shapeWorkflow>[number];
  readonly run: ReturnType<typeof runWorkflow>[number] | undefined;
  readonly interactive: boolean;
  readonly failures: Readonly<Record<string, string>>;
  readonly onToggle: (stage: string, error: string) => void;
  readonly highlightMismatch: boolean;
  readonly locale: LocaleCode;
}

function StageConnector({
  entry,
  run,
  interactive,
  failures,
  onToggle,
  highlightMismatch,
  locale,
}: StageConnectorProps): ReactNode {
  const { t } = useI18n();
  const { stage } = entry;
  const outcome = run?.outcome ?? "passed";
  return (
    <div className={`stage stage--${outcome} ${highlightMismatch ? "stage--mismatch" : ""}`}>
      <span className="stage__rail" aria-hidden="true" />
      <div className="stage__box">
        <span className="stage__kind">{t(`ui.pipeline.kind.${stage.kind.type}`)}</span>
        <strong>{stage.label[locale]}</strong>
        <small>{stage.description[locale]}</small>
      </div>
      <ul className="stage__errors">
        {stage.errors.map((error) => (
          <li key={error.codeName}>
            <button
              className={`error ${failures[stage.codeName] === error.codeName ? "error--injected" : ""}`}
              disabled={!interactive}
              aria-pressed={failures[stage.codeName] === error.codeName}
              onClick={() => {
                onToggle(stage.codeName, error.codeName);
              }}
              title={error.message[locale]}
            >
              {error.codeName}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
