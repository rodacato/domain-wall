import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { WallLayout } from "../../domain/wall/layoutWall";
import type { ContextPattern, WallArrow, WallState } from "../../domain/wall/WallState";
import { arrowBetween, wobblyClosedPath } from "./handDrawn";

export interface RegionLabel {
  readonly title: string;
  readonly advice: string | null;
}

interface WallLinesProps {
  readonly state: WallState;
  readonly layout: WallLayout;
  readonly regionLabel: (region: string) => RegionLabel;
  readonly patternName: (pattern: ContextPattern) => string;
}

function ArrowDrawing({
  arrow,
  layout,
  patternName,
}: {
  readonly arrow: WallArrow;
  readonly layout: WallLayout;
  readonly patternName: (pattern: ContextPattern) => string;
}): ReactNode {
  const from = layout.placements.get(arrow.from);
  const to = layout.placements.get(arrow.to);
  if (from === undefined || to === undefined) return null;
  const paths = arrowBetween(from, to, `${arrow.from}>${arrow.to}`);
  const label = arrow.patterns.map(patternName).join(" · ");
  const severed = arrow.style === "severed";

  return (
    <g>
      <motion.path
        d={paths.shaft}
        strokeWidth={arrow.style === "shielded" ? 5 : 3.5}
        strokeDasharray={severed ? "10 12" : undefined}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.75 }}
        transition={{ duration: 0.9, delay: 0.3 }}
      />
      {!severed && (
        <motion.path
          d={paths.head}
          strokeWidth={3.5}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.75 }}
          transition={{ delay: 1 }}
        />
      )}
      {arrow.style === "mutual" && (
        <motion.path
          d={paths.startHead}
          strokeWidth={3.5}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.75 }}
          transition={{ delay: 1 }}
        />
      )}
      {severed && (
        <motion.path
          d={paths.cross}
          strokeWidth={5}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.9 }}
          transition={{ delay: 1 }}
        />
      )}
      {arrow.style === "shielded" && (
        <motion.path
          d={paths.bar}
          strokeWidth={9}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.9 }}
          transition={{ delay: 1 }}
        />
      )}
      {label !== "" && (
        <motion.text
          className="arrow__label"
          x={paths.labelAt.x}
          y={paths.labelAt.y - 12}
          textAnchor="middle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          {label}
        </motion.text>
      )}
    </g>
  );
}

/** Hand-drawn region borders and arrows, in one SVG layer that shares the wall's coordinates. */
export function WallLines({ state, layout, regionLabel, patternName }: WallLinesProps): ReactNode {
  return (
    <svg className="wall__lines" aria-hidden="true">
      {state.boundaries.map((region) => {
        const rectangle = layout.regions.get(region);
        if (rectangle === undefined) return null;
        const label = regionLabel(region);
        return (
          <g key={region}>
            {[region, `${region}-second-stroke`].map((seed, pass) => (
              <motion.path
                key={seed}
                d={wobblyClosedPath(rectangle, seed, pass === 0 ? 7 : 11)}
                strokeWidth={pass === 0 ? 5 : 2}
                initial={{ pathLength: 0, opacity: 0.9 }}
                animate={{ pathLength: 1, opacity: pass === 0 ? 0.9 : 0.45 }}
                transition={{ duration: 1.6, ease: "easeInOut", delay: pass * 0.25 }}
              />
            ))}
            <motion.text
              className="boundary__label"
              x={rectangle.x + 26}
              y={rectangle.y + 56}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              {label.title}
            </motion.text>
            {label.advice !== null && (
              <motion.text
                className="boundary__advice"
                x={rectangle.x + 26}
                y={rectangle.y + 94}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
              >
                {label.advice}
              </motion.text>
            )}
          </g>
        );
      })}
      {state.arrows.map((arrow) => (
        <ArrowDrawing
          key={`${arrow.from}>${arrow.to}`}
          arrow={arrow}
          layout={layout}
          patternName={patternName}
        />
      ))}
    </svg>
  );
}
