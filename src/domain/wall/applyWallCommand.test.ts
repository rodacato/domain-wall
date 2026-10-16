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

  it("opens the code stage on a unit and closes it again", () => {
    const opened = applyWallCommand(EMPTY_WALL, {
      kind: "showCode",
      level: "code",
      unit: { kind: "aggregate", aggregate: "Order" },
      focus: "Order.rule.OrderMustHaveLines",
    });

    expect(opened.code).toEqual({
      level: "code",
      unit: { kind: "aggregate", aggregate: "Order" },
      focus: "Order.rule.OrderMustHaveLines",
      mode: "read",
    });
    expect(applyWallCommand(opened, { kind: "hideCode" }).code.level).toBe("hidden");
  });

  it("hides the code stage when the wall is cleared", () => {
    const state = applyWallCommands(EMPTY_WALL, [
      { kind: "showCode", level: "aggregate", unit: { kind: "events" } },
      { kind: "clearWall" },
    ]);

    expect(state.code.level).toBe("hidden");
  });
});

describe("the stages that cover the wall", () => {
  it("shows one at a time", () => {
    const code = applyWallCommands(EMPTY_WALL, [
      { kind: "showPipeline", view: "types" },
      { kind: "showCode", level: "code", unit: { kind: "events" } },
    ]);
    const pipeline = applyWallCommands(code, [{ kind: "showPipeline", view: "run" }]);

    expect(code.pipeline.view).toBe("hidden");
    expect(pipeline.code.level).toBe("hidden");
    expect(pipeline.pipeline.view).toBe("run");
  });

  it("keeps the failures and interactivity a pipeline step asks for", () => {
    const state = applyWallCommand(EMPTY_WALL, {
      kind: "showPipeline",
      view: "run",
      failures: { ChargePayment: "PaymentDeclined" },
      interactive: true,
    });

    expect(state.pipeline).toEqual({
      view: "run",
      failures: { ChargePayment: "PaymentDeclined" },
      interactive: true,
    });
    expect(applyWallCommand(state, { kind: "hidePipeline" }).pipeline.view).toBe("hidden");
  });
});
