import { describe, expect, it } from "vitest";
import { labelOfConcept } from "./conceptLabels";
import { dialogueSegments } from "./dialogueSegments";
import { buildPackIndex } from "./PackIndex";
import { loadDefaultPack } from "./packFixtures";

const index = buildPackIndex(loadDefaultPack());

describe("dialogueSegments", () => {
  it("replaces a term reference with the concept's label in the requested locale", () => {
    const line = {
      "es-MX": "Mira el {{term:Order}} ahora.",
      en: "Look at the {{term:Order}} now.",
    };

    expect(dialogueSegments(index, line, "es-MX")).toEqual([
      { kind: "text", text: "Mira el " },
      { kind: "term", codeName: "Order", text: "Pedido" },
      { kind: "text", text: " ahora." },
    ]);
    expect(dialogueSegments(index, line, "en")[1]).toEqual({
      kind: "term",
      codeName: "Order",
      text: "Order",
    });
  });

  it("keeps text without references as a single segment", () => {
    expect(dialogueSegments(index, { "es-MX": "Hola", en: "Hello" }, "en")).toEqual([
      { kind: "text", text: "Hello" },
    ]);
  });

  it("resolves every term reference of the default pack's dialogues", () => {
    for (const lines of Object.values(index.pack.dialogues)) {
      for (const line of lines) {
        for (const segment of dialogueSegments(index, line.text, "en")) {
          if (segment.kind === "term")
            expect(labelOfConcept(index, segment.codeName)).toBeDefined();
        }
      }
    }
  });
});
