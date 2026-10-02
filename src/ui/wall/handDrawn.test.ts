import { describe, expect, it } from "vitest";
import { arrowBetween, edgePoint, seededRandom, wobblyClosedPath } from "./handDrawn";

const box = { x: 0, y: 0, width: 200, height: 100 };

describe("seededRandom", () => {
  it("repeats the same sequence for the same seed and differs for another", () => {
    const first = seededRandom("wall");
    const second = seededRandom("wall");
    const other = seededRandom("board");

    const a = [first(), first(), first()];
    expect([second(), second(), second()]).toEqual(a);
    expect([other(), other(), other()]).not.toEqual(a);
    expect(a.every((value) => value >= 0 && value < 1)).toBe(true);
  });
});

describe("wobblyClosedPath", () => {
  it("is a closed path that is identical on every run", () => {
    const path = wobblyClosedPath(box, "Ordering");

    expect(path.startsWith("M ")).toBe(true);
    expect(path.endsWith(" Z")).toBe(true);
    expect(wobblyClosedPath(box, "Ordering")).toBe(path);
    expect(wobblyClosedPath(box, "Shipping")).not.toBe(path);
  });
});

describe("edgePoint", () => {
  it("leaves the rectangle on the side facing the target", () => {
    expect(edgePoint(box, { x: 1000, y: 50 })).toEqual({ x: 200, y: 50 });
    expect(edgePoint(box, { x: 100, y: -500 })).toEqual({ x: 100, y: 0 });
  });
});

describe("arrowBetween", () => {
  it("draws a shaft and a head, deterministically", () => {
    const target = { x: 400, y: 300, width: 100, height: 60 };

    const arrow = arrowBetween(box, target, "a>b");

    expect(arrow.shaft.startsWith("M ")).toBe(true);
    expect(arrow.head.match(/L/g)).toHaveLength(2);
    expect(arrowBetween(box, target, "a>b")).toEqual(arrow);
  });
});
