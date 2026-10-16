import type { PackIndex } from "../pack/PackIndex";
import type { LayoutMode } from "./LayoutMode";

export const NOTE_KINDS = [
  "event",
  "command",
  "actor",
  "policy",
  "externalSystem",
  "readModel",
  "aggregate",
  "context",
] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

/** Actors and external systems repeat above each command they issue, so their ids end in "@Command". */
export type NoteId = string & { readonly __noteId: true };

export interface NoteSpec {
  readonly id: NoteId;
  readonly kind: NoteKind;
  readonly codeName: string;
  readonly issuesCommand: string | null;
  readonly context: string;
  /** In any other layout the note has no position and is not drawn. */
  readonly appearsIn: readonly LayoutMode[];
}

const PROCESS_LAYOUTS: readonly LayoutMode[] = ["timeline", "byContext"];

export function noteIdOf(
  kind: NoteKind,
  codeName: string,
  issuesCommand: string | null = null,
): NoteId {
  return (
    issuesCommand === null ? `${kind}:${codeName}` : `${kind}:${codeName}@${issuesCommand}`
  ) as NoteId;
}

function processNote(
  kind: NoteKind,
  codeName: string,
  context: string,
  issuesCommand: string | null = null,
): NoteSpec {
  return {
    id: noteIdOf(kind, codeName, issuesCommand),
    kind,
    codeName,
    issuesCommand,
    context,
    appearsIn: PROCESS_LAYOUTS,
  };
}

export function listAllNotes(index: PackIndex): readonly NoteSpec[] {
  const { pack } = index;
  const notes: NoteSpec[] = [];

  for (const event of [...pack.events].sort((a, b) => a.sequence - b.sequence)) {
    notes.push(processNote("event", event.codeName, event.context));
  }
  for (const command of pack.commands) {
    notes.push(processNote("command", command.codeName, command.context));
    const issuer = command.issuedBy;
    const kind: NoteKind =
      issuer.kind === "actor" ? "actor" : issuer.kind === "policy" ? "policy" : "externalSystem";
    const repeated = kind !== "policy";
    notes.push(processNote(kind, issuer.ref, command.context, repeated ? command.codeName : null));
  }
  for (const readModel of pack.readModels) {
    notes.push(processNote("readModel", readModel.codeName, readModel.context));
  }
  for (const aggregate of pack.aggregates) {
    notes.push(processNote("aggregate", aggregate.codeName, aggregate.context));
  }

  for (const context of pack.contexts) {
    notes.push({
      id: noteIdOf("context", context.codeName),
      kind: "context",
      codeName: context.codeName,
      issuesCommand: null,
      context: context.codeName,
      appearsIn: ["contextMap", "subdomains"],
    });
  }
  for (const system of pack.externalSystems) {
    notes.push({
      id: noteIdOf("externalSystem", system.codeName),
      kind: "externalSystem",
      codeName: system.codeName,
      issuesCommand: null,
      context: pack.antiCorruptionLayer.context,
      appearsIn: ["contextMap"],
    });
  }
  return notes;
}

export function notesIn(index: PackIndex, layout: LayoutMode): readonly NoteSpec[] {
  return listAllNotes(index).filter((note) => note.appearsIn.includes(layout));
}

export function notesOfKind(
  index: PackIndex,
  kind: NoteKind,
  layout: LayoutMode = "timeline",
): readonly NoteId[] {
  return notesIn(index, layout)
    .filter((note) => note.kind === kind)
    .map((note) => note.id);
}
