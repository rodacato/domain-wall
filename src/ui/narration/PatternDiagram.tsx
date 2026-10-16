import type { ReactNode } from "react";
import type { ContextPattern } from "../../domain/wall/WallState";
import { useI18n } from "../i18n/I18n";

interface PatternDiagramProps {
  readonly pattern: ContextPattern;
}

const BOX = { width: 84, height: 56, top: 40 } as const;
const LEFT = 24;
const RIGHT = 192;

function Box({
  x,
  label,
  fill,
}: {
  readonly x: number;
  readonly label: string;
  readonly fill?: string;
}): ReactNode {
  return (
    <g>
      <rect x={x} y={BOX.top} width={BOX.width} height={BOX.height} rx={8} fill={fill} />
      <text
        x={x + BOX.width / 2}
        y={BOX.top + BOX.height / 2 + 6}
        textAnchor="middle"
        className="pattern__box-label"
      >
        {label}
      </text>
    </g>
  );
}

function Arrow({
  from,
  to,
  dashed = false,
  y = 68,
}: {
  readonly from: number;
  readonly to: number;
  readonly dashed?: boolean;
  readonly y?: number;
}): ReactNode {
  const direction = to > from ? 1 : -1;
  return (
    <g>
      <line x1={from} y1={y} x2={to} y2={y} strokeDasharray={dashed ? "5 5" : undefined} />
      <path d={`M ${to - direction * 9} ${y - 6} L ${to} ${y} L ${to - direction * 9} ${y + 6}`} />
    </g>
  );
}

function diagramBody(pattern: ContextPattern, upstream: string, downstream: string): ReactNode {
  switch (pattern) {
    case "CustomerSupplier":
      return (
        <>
          <Box x={LEFT} label="A" />
          <Box x={RIGHT} label="B" />
          <Arrow from={LEFT + BOX.width} to={RIGHT} />
          <Arrow from={RIGHT} to={LEFT + BOX.width} dashed y={86} />
          <text x={LEFT + 42} y={32} textAnchor="middle" className="pattern__tag">
            {upstream}
          </text>
          <text x={RIGHT + 42} y={32} textAnchor="middle" className="pattern__tag">
            {downstream}
          </text>
        </>
      );
    case "Conformist":
      return (
        <>
          <Box x={LEFT} label="A" />
          <Box x={RIGHT} label="A′" fill="var(--pattern-fill)" />
          <Arrow from={LEFT + BOX.width} to={RIGHT} />
          <text x={LEFT + 42} y={32} textAnchor="middle" className="pattern__tag">
            {upstream}
          </text>
          <text x={RIGHT + 42} y={32} textAnchor="middle" className="pattern__tag">
            {downstream}
          </text>
        </>
      );
    case "AntiCorruptionLayer":
      return (
        <>
          <Box x={LEFT} label="A" />
          <Box x={RIGHT} label="B" />
          <Arrow from={LEFT + BOX.width} to={138} />
          <rect x={138} y={34} width={18} height={68} fill="var(--pattern-fill)" strokeWidth={4} />
          <Arrow from={156} to={RIGHT} />
        </>
      );
    case "OpenHostService":
      return (
        <>
          <Box x={LEFT} label="A" />
          <circle cx={LEFT + BOX.width} cy={68} r={7} fill="var(--pattern-fill)" />
          <rect x={RIGHT} y={26} width={64} height={34} rx={7} />
          <rect x={RIGHT} y={76} width={64} height={34} rx={7} />
          <line x1={LEFT + BOX.width + 7} y1={68} x2={RIGHT - 8} y2={43} />
          <line x1={LEFT + BOX.width + 7} y1={68} x2={RIGHT - 8} y2={93} />
        </>
      );
    case "PublishedLanguage":
      return (
        <>
          <Box x={LEFT} label="A" />
          <Box x={RIGHT} label="B" />
          <Arrow from={LEFT + BOX.width} to={RIGHT} />
          <path d="M 134 28 h 22 l 8 8 v 22 h -30 z" fill="var(--pattern-fill)" />
          <line x1={139} y1={42} x2={158} y2={42} />
          <line x1={139} y1={50} x2={158} y2={50} />
        </>
      );
    case "SharedKernel":
      return (
        <>
          <rect x={LEFT + 20} y={BOX.top} width={120} height={BOX.height} rx={8} />
          <rect x={RIGHT - 52} y={BOX.top} width={120} height={BOX.height} rx={8} />
          <rect
            x={RIGHT - 52}
            y={BOX.top}
            width={72}
            height={BOX.height}
            fill="var(--pattern-fill)"
          />
          <text x={LEFT + 52} y={72} textAnchor="middle" className="pattern__box-label">
            A
          </text>
          <text x={RIGHT + 62} y={72} textAnchor="middle" className="pattern__box-label">
            B
          </text>
        </>
      );
    case "Partnership":
      return (
        <>
          <Box x={LEFT} label="A" />
          <Box x={RIGHT} label="B" />
          <Arrow from={LEFT + BOX.width} to={RIGHT} y={60} />
          <Arrow from={RIGHT} to={LEFT + BOX.width} y={78} />
        </>
      );
    case "SeparateWays":
      return (
        <>
          <Box x={LEFT} label="A" />
          <Box x={RIGHT} label="B" />
          <line x1={LEFT + BOX.width + 6} y1={68} x2={RIGHT - 6} y2={68} strokeDasharray="4 8" />
          <path d="M 138 56 L 158 80 M 158 56 L 138 80" strokeWidth={4} />
        </>
      );
  }
}

/** A generic picture of one context-mapping pattern, drawn with two abstract contexts A and B. */
export function PatternDiagram({ pattern }: PatternDiagramProps): ReactNode {
  const { t } = useI18n();
  return (
    <svg
      className="pattern"
      viewBox="0 0 300 130"
      role="img"
      aria-label={t(`ui.pattern.${pattern}.name`)}
    >
      {diagramBody(pattern, t("ui.pattern.upstream"), t("ui.pattern.downstream"))}
    </svg>
  );
}
