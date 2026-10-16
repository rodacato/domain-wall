import { describe, expect, it } from "vitest";
import { loadSyllabus } from "../../scripts/lib/loadSyllabus";
import type { ConceptId } from "../domain/course/ConceptId";
import { conceptCompletedMessage, readyMessage } from "./host";

const loaded = loadSyllabus();
if (!loaded.ok) throw new Error("the course syllabus does not parse");

describe("messages to the host", () => {
  it("announces the protocol version the course speaks", () => {
    expect(readyMessage()).toEqual({ type: "course:ready", payload: { protocolVersion: 1 } });
  });

  it("tells which module a completed concept belongs to", () => {
    const message = conceptCompletedMessage(
      loaded.value,
      "tactical.entity" as ConceptId,
      "python",
      "clinic",
    );

    expect(message).toEqual({
      type: "course:conceptCompleted",
      payload: {
        conceptId: "tactical.entity",
        moduleId: "tactical-building-blocks",
        programmingLanguage: "python",
        packId: "clinic",
      },
    });
  });
});
