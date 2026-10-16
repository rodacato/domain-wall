import type { ReactNode, SyntheticEvent } from "react";
import "./stage.css";

interface StageOverlayProps {
  readonly children: ReactNode;
  /** Lets the content use the whole stage instead of scrolling as a page. */
  readonly wide?: boolean;
}

/** Covers the wall; keeps drags and wheel turns from reaching the wall's own camera controls underneath. */
export function StageOverlay({ children, wide = false }: StageOverlayProps): ReactNode {
  const keepToThisStage = (event: SyntheticEvent): void => {
    event.stopPropagation();
  };
  return (
    <div
      className={`stage-overlay ${wide ? "stage-overlay--code" : ""}`}
      tabIndex={0}
      onPointerDown={keepToThisStage}
      onWheel={keepToThisStage}
    >
      {children}
    </div>
  );
}
