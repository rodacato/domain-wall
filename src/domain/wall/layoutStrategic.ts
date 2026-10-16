import type { PackIndex } from "../pack/PackIndex";
import { SUBDOMAIN_TYPES, type SubdomainType } from "../pack/schema/Strategy";
import { centeredPlacement, type WallLayout } from "./layoutShared";
import { noteIdOf, type NoteId } from "./Note";
import type { Placement, Rectangle } from "./Placement";
import { zoneKey } from "./WallState";

const MAP_RADIUS_X = 560;
const MAP_RADIUS_Y = 400;
const EXTERNAL_SYSTEM_DISTANCE = 1.95;

/** Contexts on an ellipse, each external system just outside the context it talks to. */
export function layoutContextMap(index: PackIndex): WallLayout {
  const { contexts, externalSystems, commands, antiCorruptionLayer } = index.pack;
  const placements = new Map<NoteId, Placement>();
  const angleOf = new Map<string, number>();

  contexts.forEach((context, position) => {
    const angle = (2 * Math.PI * position) / contexts.length - Math.PI / 2;
    angleOf.set(context.codeName, angle);
    const id = noteIdOf("context", context.codeName);
    placements.set(
      id,
      centeredPlacement(
        id,
        "context",
        MAP_RADIUS_X * Math.cos(angle),
        MAP_RADIUS_Y * Math.sin(angle),
      ),
    );
  });

  const neighbours = new Map<string, number>();
  for (const system of externalSystems) {
    const issued = commands.find(
      (command) =>
        command.issuedBy.kind === "externalSystem" && command.issuedBy.ref === system.codeName,
    );
    const context =
      system.codeName === antiCorruptionLayer.externalSystem
        ? antiCorruptionLayer.context
        : issued?.context;
    const baseAngle = angleOf.get(context ?? antiCorruptionLayer.context) ?? 0;
    const sharing = neighbours.get(context ?? "") ?? 0;
    neighbours.set(context ?? "", sharing + 1);
    const angle = baseAngle + sharing * 0.32;
    const id = noteIdOf("externalSystem", system.codeName);
    placements.set(
      id,
      centeredPlacement(
        id,
        "externalSystem",
        MAP_RADIUS_X * EXTERNAL_SYSTEM_DISTANCE * Math.cos(angle),
        MAP_RADIUS_Y * EXTERNAL_SYSTEM_DISTANCE * Math.sin(angle),
      ),
    );
  }
  return { placements, regions: new Map() };
}

const ZONE_ORDER: readonly SubdomainType[] = [...SUBDOMAIN_TYPES].reverse();
const ZONE_WIDTH = 420;
const ZONE_GAP = 60;
const ZONE_HEADER = 150;
const CARD_PITCH = 180;
const ZONE_PADDING = 40;

/** Three columns, from generic to core: the further right, the more the business invests. */
export function layoutSubdomains(index: PackIndex): WallLayout {
  const placements = new Map<NoteId, Placement>();
  const regions = new Map<string, Rectangle>();
  const tallest = Math.max(
    1,
    ...SUBDOMAIN_TYPES.map(
      (type) => index.pack.contexts.filter((context) => context.subdomain.type === type).length,
    ),
  );
  const zoneHeight = ZONE_HEADER + tallest * CARD_PITCH + ZONE_PADDING;

  ZONE_ORDER.forEach((type, column) => {
    const left = column * (ZONE_WIDTH + ZONE_GAP);
    regions.set(zoneKey(type), { x: left, y: 0, width: ZONE_WIDTH, height: zoneHeight });
    index.pack.contexts
      .filter((context) => context.subdomain.type === type)
      .forEach((context, row) => {
        const id = noteIdOf("context", context.codeName);
        placements.set(
          id,
          centeredPlacement(
            id,
            "context",
            left + ZONE_WIDTH / 2,
            ZONE_HEADER + row * CARD_PITCH + CARD_PITCH / 2,
          ),
        );
      });
  });
  return { placements, regions };
}
