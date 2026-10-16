import { HIDDEN_CODE_STAGE } from "./CodeStage";
import type { WallCommand } from "./WallCommand";
import { EMPTY_WALL, type WallArrow, type WallState } from "./WallState";

function appendMissing(
  existing: readonly string[],
  additions: readonly string[],
): readonly string[] {
  return [...existing, ...additions.filter((item) => !existing.includes(item))];
}

function withArrows(
  state: WallState,
  specs: Extract<WallCommand, { kind: "drawArrows" }>["arrows"],
): WallState {
  const present = new Set(state.notes.map((note) => note.id));
  const known = new Set(state.arrows.map((arrow) => `${arrow.from}>${arrow.to}`));
  const added: WallArrow[] = [];
  for (const spec of specs) {
    const key = `${spec.from}>${spec.to}`;
    if (!present.has(spec.from) || !present.has(spec.to) || known.has(key)) continue;
    known.add(key);
    added.push({
      from: spec.from,
      to: spec.to,
      patterns: spec.patterns ?? [],
      style: spec.style ?? "plain",
    });
  }
  return { ...state, arrows: [...state.arrows, ...added] };
}

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
      return { ...state, boundaries: appendMissing(state.boundaries, [command.region]) };
    case "eraseBoundaries":
      return { ...state, boundaries: [] };
    case "drawArrows":
      return withArrows(state, command.arrows);
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
    case "addGlossaryEntries":
      return {
        ...state,
        glossary: {
          ...state.glossary,
          entries: appendMissing(state.glossary.entries, command.concepts),
        },
      };
    case "flagAmbiguous":
      return {
        ...state,
        glossary: {
          entries: appendMissing(state.glossary.entries, [command.concept]),
          ambiguous: appendMissing(state.glossary.ambiguous, [command.concept]),
          resolved: state.glossary.resolved.filter((concept) => concept !== command.concept),
        },
      };
    case "resolveAmbiguity":
      return {
        ...state,
        glossary: {
          ...state.glossary,
          ambiguous: state.glossary.ambiguous.filter((concept) => concept !== command.concept),
          resolved: appendMissing(state.glossary.resolved, [command.concept]),
        },
      };
    case "showImpact":
      return { ...state, impact: { model: command.model, revealed: command.revealed } };
    case "hideImpact":
      return { ...state, impact: { model: null, revealed: 0 } };
    case "showCode":
      return {
        ...state,
        code: {
          level: command.level,
          unit: command.unit,
          focus: command.focus ?? null,
          mode: command.mode ?? "read",
        },
      };
    case "hideCode":
      return { ...state, code: HIDDEN_CODE_STAGE };
  }
}

export function applyWallCommands(state: WallState, commands: readonly WallCommand[]): WallState {
  return commands.reduce(applyWallCommand, state);
}
