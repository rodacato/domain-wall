import { describe, expect, it } from "vitest";
import type { NoteId } from "./Note";
import { applyWallCommand, applyWallCommands } from "./applyWallCommand";
import { EMPTY_WALL } from "./WallState";

const id = (value: string): NoteId => value as NoteId;

describe("the wall reducer", () => {
  it("places notes once, in order", () => {
    const state = applyWallCommands(EMPTY_WALL, [
      { kind: "placeNotes", ids: [id("event:A"), id("event:B")] },
      { kind: "placeNotes", ids: [id("event:B"), id("event:C")] },
    ]);

    expect(state.notes.map((note) => note.id)).toEqual(["event:A", "event:B", "event:C"]);
  });

  it("removes a note together with the arrows that touch it", () => {
    const state = applyWallCommands(EMPTY_WALL, [
      { kind: "placeNotes", ids: [id("command:X"), id("event:A"), id("event:B")] },
      {
        kind: "drawArrows",
        arrows: [
          { from: id("command:X"), to: id("event:A") },
          { from: id("command:X"), to: id("event:B") },
        ],
      },
      { kind: "removeNotes", ids: [id("event:A")] },
    ]);

    expect(state.arrows).toEqual([
      { from: "command:X", to: "event:B", patterns: [], style: "plain" },
    ]);
  });

  it("ignores arrows between notes that are not on the wall, and duplicates", () => {
    const state = applyWallCommands(EMPTY_WALL, [
      { kind: "placeNotes", ids: [id("command:X"), id("event:A")] },
      {
        kind: "drawArrows",
        arrows: [
          { from: id("command:X"), to: id("event:A") },
          { from: id("command:X"), to: id("event:A") },
          { from: id("command:X"), to: id("event:Z") },
        ],
      },
    ]);

    expect(state.arrows).toHaveLength(1);
  });

  it("emphasizes and clears emphasis", () => {
    const emphasized = applyWallCommands(EMPTY_WALL, [
      { kind: "placeNotes", ids: [id("event:A"), id("event:B")] },
      { kind: "emphasize", ids: [id("event:A")], emphasis: "highlighted" },
    ]);

    expect(emphasized.notes.map((note) => note.emphasis)).toEqual(["highlighted", "normal"]);
    expect(
      applyWallCommand(emphasized, { kind: "clearEmphasis" }).notes.every(
        (note) => note.emphasis === "normal",
      ),
    ).toBe(true);
  });

  it("keeps the layout when the wall is cleared", () => {
    const state = applyWallCommands(EMPTY_WALL, [
      { kind: "setLayout", layout: "byContext" },
      { kind: "placeNotes", ids: [id("event:A")] },
      { kind: "clearWall" },
    ]);

    expect(state.layout).toBe("byContext");
    expect(state.notes).toEqual([]);
  });

  it("draws each boundary once", () => {
    const state = applyWallCommands(EMPTY_WALL, [
      { kind: "drawBoundary", region: "Ordering" },
      { kind: "drawBoundary", region: "Ordering" },
    ]);

    expect(state.boundaries).toEqual(["Ordering"]);
  });
});
