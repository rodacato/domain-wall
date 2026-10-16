import type { Scene } from "./Scene";

export interface DemoPosition {
  readonly sceneId: string;
  readonly stepIndex: number;
}

function isExercise(scene: Scene, stepIndex: number): boolean {
  return (
    scene.steps[stepIndex]?.commands.some((command) => command.kind === "showExercise") === true
  );
}

/** Where the demo goes next: the following step, skipping each module's exercise, then the next scene; null at the end. */
export function nextDemoPosition(
  scenes: readonly Scene[],
  current: DemoPosition,
): DemoPosition | null {
  const sceneIndex = scenes.findIndex((scene) => scene.id === current.sceneId);
  const scene = scenes[sceneIndex];
  if (scene === undefined) return null;
  const following = current.stepIndex + 1;
  if (following < scene.steps.length && !isExercise(scene, following)) {
    return { sceneId: scene.id, stepIndex: following };
  }
  const next = scenes[sceneIndex + 1];
  return next === undefined ? null : { sceneId: next.id, stepIndex: 0 };
}
