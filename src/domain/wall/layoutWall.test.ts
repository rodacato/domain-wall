import { describe, expect, it } from "vitest";
import { buildPackIndex } from "../pack/PackIndex";
import { loadDefaultPack } from "../pack/packFixtures";
import { notesIn } from "./Note";
import { layoutWall } from "./layoutWall";
import type { Placement } from "./Placement";

const index = buildPackIndex(loadDefaultPack());

function overlapping(placements: readonly (readonly [string, Placement])[]): string[] {
  const clashes: string[] = [];
  for (const [position, [idA, a]] of placements.entries()) {
    for (const [idB, b] of placements.slice(position + 1)) {
      const separated =
        a.x + a.width <= b.x ||
        b.x + b.width <= a.x ||
        a.y + a.height <= b.y ||
        b.y + b.height <= a.y;
      if (!separated) clashes.push(`${idA} overlaps ${idB}`);
    }
  }
  return clashes;
}

describe.each(["timeline", "byContext"] as const)("the %s layout", (mode) => {
  const layout = layoutWall(index, mode);

  it("positions every note the pack can show", () => {
    expect(layout.placements.size).toBe(notesIn(index, mode).length);
  });

  it("never lets two notes overlap", () => {
    expect(overlapping([...layout.placements.entries()])).toEqual([]);
  });

  it("is deterministic", () => {
    expect(layoutWall(index, mode).placements).toEqual(layout.placements);
  });
});

describe("the timeline layout", () => {
  const { placements } = layoutWall(index, "timeline");
  const placementOf = (id: string): Placement => {
    const found = [...placements].find(([key]) => key === id)?.[1];
    if (found === undefined) throw new Error(`no placement for ${id}`);
    return found;
  };

  it("orders events left to right by sequence", () => {
    const xs = [...index.pack.events]
      .sort((a, b) => a.sequence - b.sequence)
      .map((event) => placementOf(`event:${event.codeName}`).x);

    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it("stacks issuer, command and event in that order, top to bottom", () => {
    const issuer = placementOf("actor:Buyer@PlaceOrder");
    const command = placementOf("command:PlaceOrder");
    const event = placementOf("event:OrderPlaced");

    expect(issuer.y).toBeLessThan(command.y);
    expect(command.y).toBeLessThan(event.y);
  });

  it("repeats an actor above each command it issues", () => {
    expect(placementOf("actor:Buyer@AddOrderLine").x).not.toBe(
      placementOf("actor:Buyer@PlaceOrder").x,
    );
  });
});

describe("the grouped layout", () => {
  const { regions } = layoutWall(index, "byContext");

  it("makes one region per bounded context", () => {
    expect([...regions.keys()].sort()).toEqual(
      index.pack.contexts.map((context) => context.codeName).sort(),
    );
  });

  it("does not let regions overlap", () => {
    const rectangles = [...regions.entries()].map(
      ([name, rectangle]) => [name, rectangle as Placement] as const,
    );

    expect(overlapping(rectangles)).toEqual([]);
  });
});
