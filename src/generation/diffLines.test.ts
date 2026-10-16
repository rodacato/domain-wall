import { describe, expect, it } from "vitest";
import { collapseUnchanged, diffLines } from "./diffLines";

describe("diffLines", () => {
  it("marks added and removed lines and numbers both sides", () => {
    const lines = diffLines("a\nb\nc\n", "a\nx\nb\nc\nd\n");

    expect(lines.map((line) => `${line.kind}:${line.text}`)).toEqual([
      "same:a",
      "added:x",
      "same:b",
      "same:c",
      "added:d",
    ]);
    expect(lines[1]).toMatchObject({ oldLine: null, newLine: 2 });
    expect(lines[2]).toMatchObject({ oldLine: 2, newLine: 3 });
  });

  it("shows a replaced line as one removal and one addition", () => {
    const lines = diffLines("a\nold\nc", "a\nnew\nc");

    expect(lines.map((line) => line.kind)).toEqual(["same", "removed", "added", "same"]);
  });

  it("treats identical texts as all unchanged and empty texts as empty", () => {
    expect(diffLines("a\nb", "a\nb").every((line) => line.kind === "same")).toBe(true);
    expect(diffLines("", "")).toEqual([]);
  });

  it("reproduces the new text from the unchanged and added lines", () => {
    const before = "one\ntwo\nthree\nfour";
    const after = "one\n2\nthree\nfour\nfive";

    const rebuilt = diffLines(before, after)
      .filter((line) => line.kind !== "removed")
      .map((line) => line.text)
      .join("\n");

    expect(rebuilt).toBe(after);
  });
});

describe("collapseUnchanged", () => {
  it("keeps the context around changes and folds the rest into gaps", () => {
    const before = Array.from({ length: 20 }, (_, n) => `line ${n}`).join("\n");
    const after = before.replace("line 10", "changed");

    const collapsed = collapseUnchanged(diffLines(before, after), 2);

    expect(collapsed.filter((entry) => entry.kind === "gap")).toEqual([
      { kind: "gap", hidden: 8 },
      { kind: "gap", hidden: 7 },
    ]);
    expect(collapsed.filter((entry) => entry.kind !== "gap").length).toBe(6);
  });
});
