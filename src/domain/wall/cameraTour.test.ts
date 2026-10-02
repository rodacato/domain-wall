import { describe, expect, it } from "vitest";
import { buildPackIndex } from "../pack/PackIndex";
import { loadDefaultPack } from "../pack/packFixtures";
import { cameraTourOfLayer, timelineSegments } from "./cameraTour";
import { notesOfKind } from "./Note";

const index = buildPackIndex(loadDefaultPack());

describe("timelineSegments", () => {
  it("covers every event, six at a time, from left to right without overlapping", () => {
    const segments = timelineSegments(index);

    expect(segments).toHaveLength(Math.ceil(index.pack.events.length / 6));
    for (const [position, segment] of segments.entries()) {
      const next = segments[position + 1];
      if (next !== undefined) expect(segment.right).toBeLessThanOrEqual(next.left + 180);
    }
  });
});

describe("cameraTourOfLayer", () => {
  it("visits every note of the layer exactly once, segment by segment", () => {
    const tour = cameraTourOfLayer(index, "event");
    if (tour.kind !== "tour") throw new Error("expected a tour for the long event timeline");

    const visited = tour.stops.flatMap((stop) => (stop.kind === "notes" ? stop.ids : []));
    expect([...visited].sort()).toEqual([...notesOfKind(index, "event")].sort());
  });

  it("covers every aggregate lane whichever way the camera is split", () => {
    const tour = cameraTourOfLayer(index, "aggregate");

    const visited =
      tour.kind === "tour"
        ? tour.stops.flatMap((stop) => (stop.kind === "notes" ? stop.ids : []))
        : [];
    expect([...visited].sort()).toEqual([...notesOfKind(index, "aggregate")].sort());
  });
});
