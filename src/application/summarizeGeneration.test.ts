import { describe, expect, it } from "vitest";
import type { GenerationEvent } from "./generatePack";
import { summarizeGeneration } from "./summarizeGeneration";

const issue = { ruleId: "S01", path: "aggregates.Order", message: "unknown rule" };

describe("summarizeGeneration", () => {
  it("shows what has not happened yet as waiting", () => {
    const summary = summarizeGeneration([]);

    expect(Object.values(summary.passes).every((pass) => pass.status === "waiting")).toBe(true);
    expect(summary.meaning).toBe("pending");
    expect(summary.done).toBe(false);
  });

  it("follows a pass from running to answered, with what it produced", () => {
    const events: GenerationEvent[] = [
      { kind: "passStarted", pass: "storm", attempt: 1 },
      { kind: "passAnswered", pass: "storm", counts: { events: 12, commands: 8 } },
      { kind: "passStarted", pass: "strategy", attempt: 1 },
    ];

    const summary = summarizeGeneration(events);

    expect(summary.passes.storm).toMatchObject({
      status: "answered",
      counts: { events: 12, commands: 8 },
    });
    expect(summary.passes.strategy.status).toBe("running");
    expect(summary.passes.model.status).toBe("waiting");
  });

  it("remembers the problems of a refused answer until the pass answers", () => {
    const refused: GenerationEvent[] = [
      { kind: "passStarted", pass: "model", attempt: 1 },
      { kind: "passRefused", pass: "model", gate: "schema", issues: [issue] },
    ];
    const answered: GenerationEvent[] = [
      ...refused,
      { kind: "passStarted", pass: "model", attempt: 2 },
      { kind: "passAnswered", pass: "model", counts: { aggregates: 2 } },
    ];

    expect(summarizeGeneration(refused).passes.model.schemaIssues).toEqual([issue]);
    expect(summarizeGeneration(answered).passes.model).toMatchObject({
      attempts: 2,
      schemaIssues: [],
    });
  });

  it("records each time the whole was sent back, the meaning gate and the code in each language", () => {
    const events: GenerationEvent[] = [
      { kind: "semanticsRefused", issues: [issue], retrying: "model" },
      { kind: "semanticsPassed" },
      { kind: "codeChecked", language: "python", passed: true },
      { kind: "codeChecked", language: "ruby", passed: false },
      { kind: "done", attempts: 5 },
    ];

    const summary = summarizeGeneration(events);

    expect(summary.refusals).toEqual([{ retrying: "model", issues: [issue] }]);
    expect(summary.meaning).toBe("passed");
    expect(summary.code).toEqual({ python: true, ruby: false });
    expect(summary.done).toBe(true);
  });
});
