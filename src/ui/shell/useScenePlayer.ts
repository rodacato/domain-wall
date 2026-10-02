import { useCallback, useEffect, useMemo, useState } from "react";
import type { Scene, SceneStep } from "../../domain/wall/Scene";
import { wallAfterStep } from "../../domain/wall/Scene";
import type { WallState } from "../../domain/wall/WallState";

export interface ScenePlayer {
  readonly scene: Scene | undefined;
  readonly step: SceneStep | undefined;
  readonly stepIndex: number;
  readonly stepCount: number;
  readonly wall: WallState | undefined;
  readonly selectScene: (sceneId: string) => void;
  readonly goTo: (stepIndex: number) => void;
  readonly next: () => void;
  readonly previous: () => void;
}

/** Plays a scene: the wall at any step is the replay of its commands, so stepping backwards is free. */
export function useScenePlayer(scenes: readonly Scene[]): ScenePlayer {
  const [sceneId, setSceneId] = useState<string | undefined>(scenes[0]?.id);
  const [stepIndex, setStepIndex] = useState(0);

  const scene = scenes.find((candidate) => candidate.id === sceneId);
  const stepCount = scene?.steps.length ?? 0;
  const wall = useMemo(
    () => (scene === undefined ? undefined : wallAfterStep(scene, stepIndex)),
    [scene, stepIndex],
  );

  const goTo = useCallback(
    (target: number) => {
      setStepIndex(Math.max(0, Math.min(stepCount - 1, target)));
    },
    [stepCount],
  );
  const next = useCallback(() => {
    goTo(stepIndex + 1);
  }, [goTo, stepIndex]);
  const previous = useCallback(() => {
    goTo(stepIndex - 1);
  }, [goTo, stepIndex]);
  const selectScene = useCallback((id: string) => {
    setSceneId(id);
    setStepIndex(0);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement)
        return;
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [next, previous]);

  return {
    scene,
    step: scene?.steps[stepIndex],
    stepIndex,
    stepCount,
    wall,
    selectScene,
    goTo,
    next,
    previous,
  };
}
