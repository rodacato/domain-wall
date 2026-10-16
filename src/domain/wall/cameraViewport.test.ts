import { describe, expect, it } from "vitest";
import { buildPackIndex } from "../pack/PackIndex";
import { loadDefaultPack } from "../pack/packFixtures";
import { frameOf, viewportFor } from "./cameraViewport";
import { layoutWall } from "./layoutWall";
import { notesOfKind } from "./Note";
import { applyWallCommands } from "./applyWallCommand";
import { EMPTY_WALL } from "./WallState";

const index = buildPackIndex(loadDefaultPack());

describe("viewportFor", () => {
  it("centres the frame in the view", () => {
    const viewport = viewportFor(
      { x: 0, y: 0, width: 1000, height: 500 },
      { width: 1000, height: 600 },
    );

    const frameCenterOnScreen = {
      x: viewport.x + 500 * viewport.scale,
      y: viewport.y + 250 * viewport.scale,
    };
    expect(frameCenterOnScreen.x).toBeCloseTo(500);
    expect(frameCenterOnScreen.y).toBeCloseTo(300);
  });

  it("zooms out for a big frame and never beyond the limits", () => {
    expect(
      viewportFor({ x: 0, y: 0, width: 100000, height: 100000 }, { width: 800, height: 600 }).scale,
    ).toBeCloseTo(0.12);
    expect(
      viewportFor({ x: 0, y: 0, width: 10, height: 10 }, { width: 800, height: 600 }).scale,
    ).toBeCloseTo(1.15);
  });
});

describe("frameOf", () => {
  const layout = layoutWall(index, "timeline");
  const withEvents = applyWallCommands(EMPTY_WALL, [
    { kind: "placeNotes", ids: notesOfKind(index, "event") },
  ]);

  it("frames a default area when the wall is empty", () => {
    expect(frameOf({ kind: "overview" }, EMPTY_WALL, layout).width).toBe(1600);
  });

  it("frames only the notes of the requested layer", () => {
    const withBoth = applyWallCommands(withEvents, [
      { kind: "placeNotes", ids: notesOfKind(index, "command") },
    ]);

    const events = frameOf({ kind: "layer", layer: "event" }, withBoth, layout);
    const everything = frameOf({ kind: "overview" }, withBoth, layout);

    expect(events.height).toBeLessThan(everything.height);
  });

  it("falls back to the overview when the layer has no notes yet", () => {
    expect(frameOf({ kind: "layer", layer: "aggregate" }, withEvents, layout)).toEqual(
      frameOf({ kind: "overview" }, withEvents, layout),
    );
  });

  it("frames a context region in the grouped layout", () => {
    const grouped = layoutWall(index, "byContext");

    expect(frameOf({ kind: "region", region: "Shipping" }, withEvents, grouped)).toEqual(
      grouped.regions.get("Shipping"),
    );
  });
});
