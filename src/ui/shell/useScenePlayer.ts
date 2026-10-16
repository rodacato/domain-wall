import { useCallback, useEffect, useMemo, useState } from "react";
import { nextDemoPosition, type DemoPosition } from "../../domain/wall/demoTour";
import type { Scene, SceneStep } from "../../domain/wall/Scene";
import { wallAfterStep } from "../../domain/wall/Scene";
import type { WallState } from "../../domain/wall/WallState";

export interface ScenePlayer {
  readonly scene: Scene | undefined;
  readonly step: SceneStep | undefined;
  readonly stepIndex: number;
  readonly stepCount: number;
  readonly wall: WallState | undefined;
  /** The scene after this one; `next` moves there from the last step. */
  readonly nextScene: Scene | undefined;
  /** Whether the course is playing itself, one step after another. */
  readonly demo: boolean;
  readonly toggleDemo: () => void;
  readonly selectScene: (sceneId: string) => void;
  readonly goTo: (stepIndex: number) => void;
  readonly next: () => void;
  readonly previous: () => void;
}

const DEMO_STEP_MILLISECONDS = 7000;

/** Plays a scene: the wall at any step is the replay of its commands, so stepping backwards is free. */
export function useScenePlayer(scenes: readonly Scene[]): ScenePlayer {
  const [position, setPosition] = useState<DemoPosition>({
    sceneId: scenes[0]?.id ?? "",
    stepIndex: 0,
  });
  const [demo, setDemo] = useState(false);

  const sceneIndex = scenes.findIndex((candidate) => candidate.id === position.sceneId);
  const scene = scenes[sceneIndex];
  const nextScene = sceneIndex === -1 ? undefined : scenes[sceneIndex + 1];
  const stepCount = scene?.steps.length ?? 0;
  const { stepIndex } = position;
  const wall = useMemo(
    () => (scene === undefined ? undefined : wallAfterStep(scene, stepIndex)),
    [scene, stepIndex],
  );

  const goTo = useCallback(
    (target: number) => {
      setDemo(false);
      setPosition((current) => ({
        ...current,
        stepIndex: Math.max(0, Math.min(stepCount - 1, target)),
      }));
    },
    [stepCount],
  );
  const next = useCallback(() => {
    if (stepIndex < stepCount - 1 || nextScene === undefined) {
      goTo(stepIndex + 1);
      return;
    }
    setDemo(false);
    setPosition({ sceneId: nextScene.id, stepIndex: 0 });
  }, [goTo, stepIndex, stepCount, nextScene]);
  const previous = useCallback(() => {
    goTo(stepIndex - 1);
  }, [goTo, stepIndex]);
  const selectScene = useCallback((id: string) => {
    setDemo(false);
    setPosition({ sceneId: id, stepIndex: 0 });
  }, []);
  const toggleDemo = useCallback(() => {
    setDemo((playing) => !playing);
  }, []);

  useEffect(() => {
    if (!demo) return;
    const timer = window.setInterval(() => {
      setPosition((current) => {
        const following = nextDemoPosition(scenes, current);
        if (following === null) {
          setDemo(false);
          return current;
        }
        return following;
      });
    }, DEMO_STEP_MILLISECONDS);
    return () => {
      window.clearInterval(timer);
    };
  }, [demo, scenes]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof Element && target.closest('[role="dialog"]') !== null)
      )
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
    nextScene,
    demo,
    toggleDemo,
    selectScene,
    goTo,
    next,
    previous,
  };
}
