import { describe, expect, it } from "vitest";
import { extractAnchors } from "./extractAnchors";

describe("extractAnchors", () => {
  it("records the lines between marker-only lines and removes the markers", () => {
    const raw = ["first", "⟦anchor A⟧", "second", "third", "⟦/anchor⟧", "fourth"].join("\n");

    const result = extractAnchors(raw);

    expect(result).toEqual({
      ok: true,
      value: {
        content: "first\nsecond\nthird\nfourth",
        anchors: [{ ref: "A", startLine: 2, endLine: 3 }],
      },
    });
  });

  it("anchors a single line when the markers share it with code", () => {
    const result = extractAnchors("a\nif (x) ⟦anchor R⟧return⟦/anchor⟧;\nb");

    expect(result.ok && result.value).toEqual({
      content: "a\nif (x) return;\nb",
      anchors: [{ ref: "R", startLine: 2, endLine: 2 }],
    });
  });

  it("supports nested anchors, outermost first", () => {
    const raw = ["⟦anchor Outer⟧", "x", "⟦anchor Inner⟧", "y", "⟦/anchor⟧", "⟦/anchor⟧"].join("\n");

    const result = extractAnchors(raw);

    expect(result.ok && result.value.anchors).toEqual([
      { ref: "Outer", startLine: 1, endLine: 2 },
      { ref: "Inner", startLine: 2, endLine: 2 },
    ]);
  });

  it("reports an anchor that is never closed or closed twice", () => {
    expect(extractAnchors("⟦anchor A⟧\nx").ok).toBe(false);
    expect(extractAnchors("x\n⟦/anchor⟧").ok).toBe(false);
  });
});
