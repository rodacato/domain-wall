import type { PackIndex } from "../pack/PackIndex";

/** The Event Storming colour convention (see the visual language in the proposal). */
export const NOTE_KINDS = [
  "event",
  "command",
  "actor",
  "policy",
  "externalSystem",
  "readModel",
  "aggregate",
] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

/**
 * Identifies a sticky note on the wall. Actors and external systems are repeated next to every
 * command they issue, like real stickies, so their ids carry the command: "actor:Buyer@PlaceOrder".
 */
export type NoteId = string & { readonly __noteId: true };

export interface NoteSpec {
  readonly id: NoteId;
  readonly kind: NoteKind;
  /** The pack concept the note shows. */
  readonly codeName: string;
  /** The command a repeated issuer note sits above; null for every other note. */
  readonly issuesCommand: string | null;
  readonly context: string;
}

export function noteIdOf(
  kind: NoteKind,
  codeName: string,
  issuesCommand: string | null = null,
): NoteId {
  return (
    issuesCommand === null ? `${kind}:${codeName}` : `${kind}:${codeName}@${issuesCommand}`
  ) as NoteId;
}

/** Every note the pack can put on the wall, in a stable order. */
export function listAllNotes(index: PackIndex): readonly NoteSpec[] {
  const { pack } = index;
  const notes: NoteSpec[] = [];

  for (const event of [...pack.events].sort((a, b) => a.sequence - b.sequence)) {
    notes.push({
      id: noteIdOf("event", event.codeName),
      kind: "event",
      codeName: event.codeName,
      issuesCommand: null,
      context: event.context,
    });
  }
  for (const command of pack.commands) {
    notes.push({
      id: noteIdOf("command", command.codeName),
      kind: "command",
      codeName: command.codeName,
      issuesCommand: null,
      context: command.context,
    });
    const issuer = command.issuedBy;
    const kind: NoteKind =
      issuer.kind === "actor" ? "actor" : issuer.kind === "policy" ? "policy" : "externalSystem";
    const repeated = kind !== "policy";
    notes.push({
      id: noteIdOf(kind, issuer.ref, repeated ? command.codeName : null),
      kind,
      codeName: issuer.ref,
      issuesCommand: repeated ? command.codeName : null,
      context: command.context,
    });
  }
  for (const readModel of pack.readModels) {
    notes.push({
      id: noteIdOf("readModel", readModel.codeName),
      kind: "readModel",
      codeName: readModel.codeName,
      issuesCommand: null,
      context: readModel.context,
    });
  }
  for (const aggregate of pack.aggregates) {
    notes.push({
      id: noteIdOf("aggregate", aggregate.codeName),
      kind: "aggregate",
      codeName: aggregate.codeName,
      issuesCommand: null,
      context: aggregate.context,
    });
  }
  return notes;
}

export function notesOfKind(index: PackIndex, kind: NoteKind): readonly NoteId[] {
  return listAllNotes(index)
    .filter((note) => note.kind === kind)
    .map((note) => note.id);
}
