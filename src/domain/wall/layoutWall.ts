import type { PackIndex } from "../pack/PackIndex";
import { listAllNotes, type NoteId, type NoteKind, type NoteSpec } from "./Note";
import type { Placement, Rectangle } from "./Placement";
import type { LayoutMode } from "./WallState";

export const NOTE_SIZE: Readonly<
  Record<NoteKind, { readonly width: number; readonly height: number }>
> = {
  event: { width: 128, height: 96 },
  command: { width: 128, height: 96 },
  actor: { width: 88, height: 72 },
  policy: { width: 128, height: 96 },
  externalSystem: { width: 128, height: 96 },
  readModel: { width: 128, height: 96 },
  aggregate: { width: 240, height: 120 },
};

const BASE_COLUMN_WIDTH = 190;
const SIDE_BY_SIDE_COMMAND_WIDTH = 150;
const REGION_PADDING = 70;
const REGION_GAP = 120;
const REGIONS_PER_ROW = 2;

/** Vertical bands, top to bottom: read models, issuers, commands, events, aggregate lanes. */
const BAND_Y = { readModel: 0, issuer: 150, command: 290, event: 430, aggregate: 580 } as const;
const AGGREGATE_LANE_HEIGHT = 150;
/** Room above each region for its name and for the floating term note. */
const REGION_HEADER = 260;

interface Column {
  readonly eventName: string | null;
  readonly left: number;
  readonly width: number;
}

/** A small deterministic tilt in [-3, 3] degrees derived from the note's id. */
function tiltOf(id: string): number {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) % 997;
  return (hash % 7) - 3;
}

function firstEmittedEvent(index: PackIndex, commandName: string): string | null {
  for (const aggregate of index.pack.aggregates) {
    const transition = aggregate.transitions.find((candidate) => candidate.command === commandName);
    if (transition !== undefined) return transition.emits[0] ?? null;
  }
  return null;
}

/** Lays out the notes that belong to one region (the whole pack for the timeline, one context otherwise). */
function layoutRegion(
  index: PackIndex,
  notes: readonly NoteSpec[],
  originX: number,
  originY: number,
): Map<NoteId, Placement> {
  const placements = new Map<NoteId, Placement>();
  const events = notes.filter((note) => note.kind === "event");
  const commands = notes.filter((note) => note.kind === "command");

  const commandsByEvent = new Map<string, NoteSpec[]>();
  for (const command of commands) {
    const eventName = firstEmittedEvent(index, command.codeName);
    if (eventName === null) continue;
    commandsByEvent.set(eventName, [...(commandsByEvent.get(eventName) ?? []), command]);
  }

  const columns: Column[] = [];
  let cursor = originX + REGION_PADDING;
  for (const event of events) {
    const sharing = commandsByEvent.get(event.codeName)?.length ?? 0;
    const width = Math.max(BASE_COLUMN_WIDTH, sharing * SIDE_BY_SIDE_COMMAND_WIDTH + 40);
    columns.push({ eventName: event.codeName, left: cursor, width });
    cursor += width;
  }
  const columnOfEvent = (eventName: string | null): Column | undefined =>
    columns.find((column) => column.eventName === eventName) ?? columns[0];

  const place = (note: NoteSpec, centerX: number, top: number): void => {
    const size = NOTE_SIZE[note.kind];
    placements.set(note.id, {
      x: centerX - size.width / 2,
      y: top,
      ...size,
      rotation: tiltOf(note.id),
    });
  };

  for (const event of events) {
    const column = columnOfEvent(event.codeName);
    if (column !== undefined) place(event, column.left + column.width / 2, originY + BAND_Y.event);
  }

  for (const [eventName, sharing] of commandsByEvent) {
    const column = columnOfEvent(eventName);
    if (column === undefined) continue;
    sharing.forEach((command, position) => {
      const centerX = column.left + (column.width / (sharing.length * 2)) * (position * 2 + 1);
      place(command, centerX, originY + BAND_Y.command);
      const issuer = notes.find(
        (note) =>
          (note.issuesCommand === command.codeName || note.kind === "policy") &&
          isIssuerOf(index, note, command.codeName),
      );
      if (issuer !== undefined)
        place(issuer, centerX, originY + BAND_Y.issuer + (issuer.kind === "actor" ? 12 : 0));
    });
  }

  for (const readModel of notes.filter((note) => note.kind === "readModel")) {
    const model = index.pack.readModels.find(
      (candidate) => candidate.codeName === readModel.codeName,
    );
    const fedColumns = (model?.fedBy ?? [])
      .map((eventName) => columnOfEvent(eventName))
      .filter((column) => column !== undefined);
    const column = fedColumns[fedColumns.length - 1] ?? columns[0];
    if (column !== undefined)
      place(readModel, column.left + column.width / 2, originY + BAND_Y.readModel);
  }

  const aggregates = notes.filter((note) => note.kind === "aggregate");
  aggregates.forEach((aggregateNote, lane) => {
    const aggregate = index.aggregates.get(aggregateNote.codeName);
    const emitted = new Set<string>(
      aggregate?.transitions.flatMap((transition) => transition.emits) ?? [],
    );
    const spanned = columns.filter(
      (column) => column.eventName !== null && emitted.has(column.eventName),
    );
    const first = spanned[0];
    const last = spanned[spanned.length - 1];
    const centerX =
      first === undefined || last === undefined
        ? cursor / 2
        : (first.left + last.left + last.width) / 2;
    place(aggregateNote, centerX, originY + BAND_Y.aggregate + lane * AGGREGATE_LANE_HEIGHT);
  });

  return placements;
}

function isIssuerOf(index: PackIndex, note: NoteSpec, commandName: string): boolean {
  const command = index.commands.get(commandName);
  if (command === undefined) return false;
  if (note.kind === "policy")
    return command.issuedBy.kind === "policy" && command.issuedBy.ref === note.codeName;
  return note.issuesCommand === commandName;
}

export interface WallLayout {
  readonly placements: ReadonlyMap<NoteId, Placement>;
  /** One region per bounded context in the grouped layout; empty for the timeline. */
  readonly regions: ReadonlyMap<string, Rectangle>;
}

/** Positions for every note the pack can show; the wall draws the subset that is currently placed. */
export function layoutWall(index: PackIndex, mode: LayoutMode): WallLayout {
  const notes = listAllNotes(index);

  if (mode === "timeline") {
    return { placements: layoutRegion(index, notes, 0, 0), regions: new Map() };
  }

  const placements = new Map<NoteId, Placement>();
  const regions = new Map<string, Rectangle>();
  let rowTop = 0;
  let rowHeight = 0;
  let cursorX = 0;
  index.pack.contexts.forEach((context, position) => {
    if (position % REGIONS_PER_ROW === 0 && position > 0) {
      rowTop += rowHeight + REGION_GAP;
      rowHeight = 0;
      cursorX = 0;
    }
    const regionNotes = notes.filter((note) => note.context === context.codeName);
    const regionPlacements = layoutRegion(index, regionNotes, cursorX, rowTop + REGION_HEADER);
    for (const [id, placement] of regionPlacements) placements.set(id, placement);

    const bounds = boundsOf([...regionPlacements.values()]);
    const region: Rectangle = {
      x: Math.min(bounds.x, cursorX) - REGION_PADDING / 2,
      y: rowTop,
      width: bounds.x + bounds.width - cursorX + REGION_PADDING * 1.5,
      height: bounds.y + bounds.height - rowTop + REGION_PADDING / 2,
    };
    regions.set(context.codeName, region);
    cursorX += region.width + REGION_GAP;
    rowHeight = Math.max(rowHeight, region.height);
  });
  return { placements, regions };
}

export function boundsOf(rectangles: readonly Rectangle[]): Rectangle {
  if (rectangles.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const left = Math.min(...rectangles.map((rectangle) => rectangle.x));
  const top = Math.min(...rectangles.map((rectangle) => rectangle.y));
  const right = Math.max(...rectangles.map((rectangle) => rectangle.x + rectangle.width));
  const bottom = Math.max(...rectangles.map((rectangle) => rectangle.y + rectangle.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}
