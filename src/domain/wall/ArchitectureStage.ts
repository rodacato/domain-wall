/** What the architecture stage draws: layers that depend downwards, the hexagon, swappable adapters, or the dependency rule. */
export type ArchitectureView = "hidden" | "layers" | "hexagon" | "swap" | "rule";

export interface ArchitectureStageState {
  readonly view: ArchitectureView;
}

export const HIDDEN_ARCHITECTURE: ArchitectureStageState = { view: "hidden" };
