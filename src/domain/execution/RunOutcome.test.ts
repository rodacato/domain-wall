import { describe, expect, it } from "vitest";
import { allPassed, parseTestResults, type RunOutcome } from "./RunOutcome";

describe("parseTestResults", () => {
  it("reads the test lines of the harness and ignores everything else", () => {
    const stdout = [
      "warning: something",
      '{"type":"test","name":"Order completes its happy path","status":"passed"}',
      '{"type":"test","name":"Order rejects","status":"failed","message":"expected A but got B"}',
      '{"type":"summary","passed":1,"failed":1}',
      "{ not json",
    ].join("\n");

    expect(parseTestResults(stdout)).toEqual([
      { name: "Order completes its happy path", status: "passed", message: null },
      { name: "Order rejects", status: "failed", message: "expected A but got B" },
    ]);
  });
});

describe("allPassed", () => {
  it("is true only for an executed run whose tests all passed", () => {
    const passed = { name: "a", status: "passed", message: null } as const;
    const failed = { name: "b", status: "failed", message: null } as const;
    const run = (tests: readonly (typeof passed | typeof failed)[]): RunOutcome => ({
      kind: "executed",
      tests,
      durationMs: 1,
    });

    expect(allPassed(run([passed]))).toBe(true);
    expect(allPassed(run([passed, failed]))).toBe(false);
    expect(allPassed(run([]))).toBe(false);
    expect(allPassed({ kind: "syntaxChecked", diagnostics: [] })).toBe(false);
  });
});
