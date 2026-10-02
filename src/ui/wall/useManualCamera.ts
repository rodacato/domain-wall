import { useCallback, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import type { Viewport } from "../../domain/wall/cameraViewport";

const MINIMUM_SCALE = 0.08;
const MAXIMUM_SCALE = 2.2;

interface ManualViewport {
  /** The scripted camera this override belongs to; a new scripted camera discards it. */
  readonly cameraKey: string;
  readonly viewport: Viewport;
}

export interface ManualCamera {
  /** The viewport to show: the learner's own while they explore, otherwise null (the scripted camera rules). */
  readonly override: Viewport | null;
  readonly handlers: {
    readonly onPointerDown: (event: PointerEvent<HTMLElement>) => void;
    readonly onPointerMove: (event: PointerEvent<HTMLElement>) => void;
    readonly onPointerUp: (event: PointerEvent<HTMLElement>) => void;
    readonly onWheel: (event: WheelEvent<HTMLElement>) => void;
  };
}

/** Lets the learner drag and zoom the wall. The scripted camera takes over again at the next step. */
export function useManualCamera(cameraKey: string, scripted: Viewport): ManualCamera {
  const [manual, setManual] = useState<ManualViewport | null>(null);
  const drag = useRef<{ pointerX: number; pointerY: number; start: Viewport } | null>(null);

  const current = manual?.cameraKey === cameraKey ? manual.viewport : scripted;

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { pointerX: event.clientX, pointerY: event.clientY, start: current };
    },
    [current],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const dragging = drag.current;
      if (dragging === null) return;
      setManual({
        cameraKey,
        viewport: {
          scale: dragging.start.scale,
          x: dragging.start.x + event.clientX - dragging.pointerX,
          y: dragging.start.y + event.clientY - dragging.pointerY,
        },
      });
    },
    [cameraKey],
  );

  const onPointerUp = useCallback(() => {
    drag.current = null;
  }, []);

  const onWheel = useCallback(
    (event: WheelEvent<HTMLElement>) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      const cursorX = event.clientX - bounds.left;
      const cursorY = event.clientY - bounds.top;
      const scale = Math.min(
        MAXIMUM_SCALE,
        Math.max(MINIMUM_SCALE, current.scale * Math.exp(-event.deltaY * 0.0015)),
      );
      const ratio = scale / current.scale;
      setManual({
        cameraKey,
        viewport: {
          scale,
          x: cursorX - (cursorX - current.x) * ratio,
          y: cursorY - (cursorY - current.y) * ratio,
        },
      });
    },
    [cameraKey, current],
  );

  return {
    override: manual?.cameraKey === cameraKey ? manual.viewport : null,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onWheel },
  };
}
