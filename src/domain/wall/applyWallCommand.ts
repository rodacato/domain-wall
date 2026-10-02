import type { WallCommand } from "./WallCommand";
import type { WallArrow, WallState } from "./WallState";
import { EMPTY_WALL } from "./WallState";

/** The wall's reducer: a pure function, so any scene step can be reached by replaying commands. */
export function applyWallCommand(state: WallState, command: WallCommand): WallState {
  switch (command.kind) {
    case "placeNotes": {
      const alreadyThere = new Set(state.notes.map((note) => note.id));
      const added = command.ids
        .filter((id) => !alreadyThere.has(id))
        .map((id) => ({ id, emphasis: "normal" as const }));
      return { ...state, notes: [...state.notes, ...added] };
    }
    case "removeNotes": {
      const removed = new Set(command.ids);
      return {
        ...state,
        notes: state.notes.filter((note) => !removed.has(note.id)),
        arrows: state.arrows.filter((arrow) => !removed.has(arrow.from) && !removed.has(arrow.to)),
      };
    }
    case "clearWall":
      return { ...EMPTY_WALL, layout: state.layout };
    case "setLayout":
      return { ...state, layout: command.layout };
    case "drawBoundary":
      return state.boundaries.includes(command.context)
        ? state
        : { ...state, boundaries: [...state.boundaries, command.context] };
    case "eraseBoundaries":
      return { ...state, boundaries: [] };
    case "drawArrows": {
      const present = new Set(state.notes.map((note) => note.id));
      const known = new Set(state.arrows.map((arrow) => `${arrow.from}>${arrow.to}`));
      const added: WallArrow[] = [];
      for (const arrow of command.arrows) {
        const key = `${arrow.from}>${arrow.to}`;
        if (!present.has(arrow.from) || !present.has(arrow.to) || known.has(key)) continue;
        known.add(key);
        added.push({ from: arrow.from, to: arrow.to });
      }
      return { ...state, arrows: [...state.arrows, ...added] };
    }
    case "eraseArrows":
      return { ...state, arrows: [] };
    case "emphasize": {
      const targeted = new Set(command.ids);
      return {
        ...state,
        notes: state.notes.map((note) =>
          targeted.has(note.id) ? { ...note, emphasis: command.emphasis } : note,
        ),
      };
    }
    case "clearEmphasis":
      return {
        ...state,
        notes: state.notes.map((note) => ({ ...note, emphasis: "normal" as const })),
      };
    case "focusCamera":
      return { ...state, camera: command.target };
    case "showTerm":
      return { ...state, term: { shown: true, context: command.context } };
    case "hideTerm":
      return { ...state, term: { shown: false, context: null } };
  }
}

export function applyWallCommands(state: WallState, commands: readonly WallCommand[]): WallState {
  return commands.reduce(applyWallCommand, state);
}
