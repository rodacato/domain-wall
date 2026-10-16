import { describe, expect, it } from "vitest";
import { buildPackIndex } from "../pack/PackIndex";
import { loadDefaultPack } from "../pack/packFixtures";
import { layoutWall } from "./layoutWall";
import { notesIn } from "./Note";
import type { Placement, Rectangle } from "./Placement";
import { zoneKey } from "./WallState";

const index = buildPackIndex(loadDefaultPack());

function contains(outer: Rectangle, inner: Placement): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function overlaps(a: Rectangle, b: Rectangle): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

describe("the context map layout", () => {
  const { placements } = layoutWall(index, "contextMap");

  it("positions every context and every external system", () => {
    expect(placements.size).toBe(notesIn(index, "contextMap").length);
  });

  it("keeps all the cards apart", () => {
    const cards = [...placements.values()];

    const clashes = cards.flatMap((card, position) =>
      cards.slice(position + 1).filter((other) => overlaps(card, other)),
    );
    expect(clashes).toEqual([]);
  });
});

describe("the subdomain chart layout", () => {
  const { placements, regions } = layoutWall(index, "subdomains");

  it("draws a zone for each subdomain type, with generic on the left and core on the right", () => {
    const left = (type: string): number => regions.get(zoneKey(type))?.x ?? NaN;

    expect(regions.size).toBe(3);
    expect(left("generic")).toBeLessThan(left("supporting"));
    expect(left("supporting")).toBeLessThan(left("core"));
  });

  it("puts every context inside the zone of its subdomain type", () => {
    for (const context of index.pack.contexts) {
      const zone = regions.get(zoneKey(context.subdomain.type));
      const card = [...placements].find(([id]) => id === `context:${context.codeName}`)?.[1];

      expect(zone !== undefined && card !== undefined && contains(zone, card)).toBe(true);
    }
  });
});
