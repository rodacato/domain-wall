/** A rectangle in wall units. The wall is a large virtual canvas; the camera decides what part is visible. */
export interface Rectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Placement extends Rectangle {
  /** Degrees; a small deterministic tilt so notes look hand-placed but are identical on every run. */
  readonly rotation: number;
}
