import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { ViewSize } from "../../domain/wall/cameraViewport";

/** Tracks the pixel size of an element, so the camera can fit the wall to it. */
export function useElementSize<ElementType extends HTMLElement>(): readonly [
  RefObject<ElementType | null>,
  ViewSize,
] {
  const reference = useRef<ElementType | null>(null);
  const [size, setSize] = useState<ViewSize>({ width: 1280, height: 720 });

  useLayoutEffect(() => {
    const element = reference.current;
    if (element === null) return;
    const measure = (): void => {
      setSize({ width: element.clientWidth, height: element.clientHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return [reference, size];
}
