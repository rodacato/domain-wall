import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { WallLayout } from "../../domain/wall/layoutWall";
import type { WallState } from "../../domain/wall/WallState";
import { arrowBetween, wobblyClosedPath } from "./handDrawn";

interface WallLinesProps {
  readonly state: WallState;
  readonly layout: WallLayout;
  readonly contextLabel: (context: string) => string;
}

/** Hand-drawn arrows and context boundaries, drawn in one SVG layer under the notes' coordinate system. */
export function WallLines({ state, layout, contextLabel }: WallLinesProps): ReactNode {
  return (
    <svg className="wall__lines" aria-hidden="true">
      {state.boundaries.map((context) => {
        const region = layout.regions.get(context);
        if (region === undefined) return null;
        return (
          <g key={context}>
            {[context, `${context}-second-stroke`].map((seed, pass) => (
              <motion.path
                key={seed}
                d={wobblyClosedPath(region, seed, pass === 0 ? 7 : 11)}
                strokeWidth={pass === 0 ? 5 : 2}
                initial={{ pathLength: 0, opacity: 0.9 }}
                animate={{ pathLength: 1, opacity: pass === 0 ? 0.9 : 0.45 }}
                transition={{ duration: 1.6, ease: "easeInOut", delay: pass * 0.25 }}
              />
            ))}
            <motion.text
              className="boundary__label"
              x={region.x + 26}
              y={region.y + 56}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              {contextLabel(context)}
            </motion.text>
          </g>
        );
      })}
      {state.arrows.map((arrow) => {
        const from = layout.placements.get(arrow.from);
        const to = layout.placements.get(arrow.to);
        if (from === undefined || to === undefined) return null;
        const paths = arrowBetween(from, to, `${arrow.from}>${arrow.to}`);
        return (
          <g key={`${arrow.from}>${arrow.to}`}>
            <motion.path
              d={paths.shaft}
              strokeWidth={3}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.7 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
            <motion.path
              d={paths.head}
              strokeWidth={3}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 1 }}
            />
          </g>
        );
      })}
    </svg>
  );
}
