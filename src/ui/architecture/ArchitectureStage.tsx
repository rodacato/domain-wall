import { motion } from "motion/react";
import { useMemo, useState, type ReactNode } from "react";
import type { CourseSession } from "../../application/CourseSession";
import { portsOf, type DomainPort, type PortKind } from "../../domain/pack/ports";
import type { ArchitectureStageState } from "../../domain/wall/ArchitectureStage";
import { useI18n } from "../i18n/I18n";
import { StageOverlay } from "../wall/StageOverlay";
import "./architecture.css";

interface ArchitectureStageProps {
  readonly session: CourseSession;
  readonly architecture: ArchitectureStageState;
}

type ShownView = Exclude<ArchitectureStageState["view"], "hidden">;

const LAYERS = ["presentation", "application", "domain", "infrastructure"] as const;
const DRIVING_ADAPTERS = ["web", "api", "job"] as const;
const ADAPTERS: Readonly<Record<PortKind, readonly string[]>> = {
  repository: ["memory", "sql"],
  gateway: ["fake", "http"],
  external: ["fake", "http"],
};

export function ArchitectureStage({ session, architecture }: ArchitectureStageProps): ReactNode {
  if (architecture.view === "hidden") return null;
  return <Diagram key={architecture.view} session={session} view={architecture.view} />;
}

function Diagram({
  session,
  view,
}: {
  readonly session: CourseSession;
  readonly view: ShownView;
}): ReactNode {
  const { t } = useI18n();
  return (
    <StageOverlay>
      <h2 className="arch__title">{t(`ui.architecture.title.${view}`)}</h2>
      {view === "layers" ? <Layers /> : <Hexagon session={session} view={view} />}
    </StageOverlay>
  );
}

function Layers(): ReactNode {
  const { t } = useI18n();
  return (
    <ol className="layers">
      {LAYERS.map((layer, position) => (
        <motion.li
          key={layer}
          className={`layers__bar layers__bar--${layer}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: position * 0.12 }}
        >
          <strong>{t(`ui.architecture.layer.${layer}.name`)}</strong>
          <span>{t(`ui.architecture.layer.${layer}.note`)}</span>
          {position < LAYERS.length - 1 && <span className="layers__arrow">↓</span>}
        </motion.li>
      ))}
      <li className="arch__warning">{t("ui.architecture.layerCost")}</li>
    </ol>
  );
}

function Hexagon({
  session,
  view,
}: {
  readonly session: CourseSession;
  readonly view: "hexagon" | "swap" | "rule";
}): ReactNode {
  const { locale, t } = useI18n();
  const ports = useMemo(() => portsOf(session.index), [session.index]);
  const [chosen, setChosen] = useState<Readonly<Record<string, string>>>({});
  const [lastSwap, setLastSwap] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const swappable = view === "swap";

  const adapterOf = (port: DomainPort): string =>
    chosen[port.codeName] ?? ADAPTERS[port.kind][0] ?? "";
  const aggregates = session.index.pack.aggregates;
  const sample = ports.find((port) => port.kind === "repository");

  return (
    <div className="hexagon">
      <ul className="hexagon__side hexagon__side--driving">
        <li className="hexagon__heading">{t("ui.architecture.driving.title")}</li>
        {DRIVING_ADAPTERS.map((adapter) => (
          <li key={adapter} className="adapter">
            {t(`ui.architecture.driving.${adapter}`)}
          </li>
        ))}
      </ul>

      <div className="hexagon__core" role="img" aria-label={t("ui.architecture.core")}>
        <strong>{t("ui.architecture.core")}</strong>
        <span className="hexagon__aggregates">
          {aggregates.map((aggregate) => (
            <span key={aggregate.codeName} className="mini mini--aggregate">
              {aggregate.label[locale]}
            </span>
          ))}
        </span>
        <small>{t("ui.architecture.coreNote")}</small>
        {swappable && lastSwap !== null && (
          <motion.span
            key={lastSwap}
            className="hexagon__unchanged"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            {t("ui.architecture.unchanged")}
          </motion.span>
        )}
      </div>

      <ul className="hexagon__side hexagon__side--driven">
        <li className="hexagon__heading">{t("ui.architecture.driven.title")}</li>
        {ports.map((port) => (
          <li key={port.codeName} className="port">
            <span className="port__name">{port.codeName}</span>
            {port.description !== undefined && (
              <small className="port__description">{port.description[locale]}</small>
            )}
            <span className="port__adapters">
              {ADAPTERS[port.kind].map((adapter) => (
                <button
                  key={adapter}
                  className="adapter adapter--choice"
                  aria-pressed={adapterOf(port) === adapter}
                  disabled={!swappable}
                  onClick={() => {
                    setChosen((current) => ({ ...current, [port.codeName]: adapter }));
                    setLastSwap(`${port.codeName}:${adapter}`);
                  }}
                >
                  {t(`ui.architecture.adapter.${port.kind}.${adapter}`)}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>

      {swappable && <p className="arch__hint">{t("ui.architecture.swapHint")}</p>}

      {view === "rule" && sample !== undefined && (
        <div className="rule">
          <p className="rule__line rule__line--good">
            <span>{t("ui.architecture.adapterKnowsDomain", { port: sample.codeName })}</span>
            <b>✓</b>
          </p>
          {broken ? (
            <motion.p
              className="rule__line rule__line--bad"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <span>{t("ui.architecture.domainKnowsAdapter")}</span>
              <b>✗</b>
            </motion.p>
          ) : (
            <button
              className="rule__try"
              onClick={() => {
                setBroken(true);
              }}
            >
              {t("ui.architecture.tryBreaking")}
            </button>
          )}
          {broken && <p className="arch__warning">{t("ui.architecture.ruleBroken")}</p>}
        </div>
      )}
    </div>
  );
}
