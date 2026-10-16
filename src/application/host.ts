import type { ConceptId } from "../domain/course/ConceptId";
import { moduleOfConcept, type Syllabus } from "../domain/course/Syllabus";
import type { ProgrammingLanguageId } from "../domain/language/ProgrammingLanguage";
import {
  HOST_PROTOCOL_VERSION,
  type CourseMessage,
  type HostBridge,
  type HostMessage,
} from "../ports/HostBridge";

export type { HostBridge, HostMessage };
export { HOST_PROTOCOL_VERSION };

/** What the host has said it can do for the course. */
export interface HostCapabilities {
  readonly remoteExecution: boolean;
  readonly llm: boolean;
}

export const NO_CAPABILITIES: HostCapabilities = { remoteExecution: false, llm: false };

export function readyMessage(): CourseMessage {
  return { type: "course:ready", payload: { protocolVersion: HOST_PROTOCOL_VERSION } };
}

export function conceptCompletedMessage(
  syllabus: Syllabus,
  conceptId: ConceptId,
  programmingLanguage: ProgrammingLanguageId,
  packId: string,
): CourseMessage {
  return {
    type: "course:conceptCompleted",
    payload: {
      conceptId,
      moduleId: moduleOfConcept(syllabus, conceptId)?.id ?? null,
      programmingLanguage,
      packId,
    },
  };
}
