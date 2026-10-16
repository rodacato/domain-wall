import { describe, expect, it } from "vitest";
import { tokenizeLine } from "./highlight";

describe("tokenizeLine", () => {
  it("separates keywords, types, strings and numbers in TypeScript", () => {
    const tokens = tokenizeLine('export const Limit: Quantity = "5"; // five', "typescript");

    expect(tokens.map((token) => [token.kind, token.text])).toEqual([
      ["keyword", "export"],
      ["plain", " "],
      ["keyword", "const"],
      ["plain", " "],
      ["type", "Limit"],
      ["plain", ": "],
      ["type", "Quantity"],
      ["plain", " = "],
      ["string", '"5"'],
      ["plain", "; "],
      ["comment", "// five"],
    ]);
  });

  it("treats # as a comment in Python and Ruby but not inside a string", () => {
    expect(tokenizeLine('x = "a # b"  # note', "python").map((token) => token.kind)).toEqual([
      "plain",
      "string",
      "plain",
      "comment",
    ]);
    expect(tokenizeLine("def total # sum", "ruby").at(-1)).toEqual({
      kind: "comment",
      text: "# sum",
    });
  });

  it("reads Ruby symbols as one token", () => {
    expect(tokenizeLine("return reject(:order_must_have_lines) if x", "ruby")).toContainEqual({
      kind: "symbol",
      text: ":order_must_have_lines",
    });
  });

  it("keeps every character of the line", () => {
    const line = '  return err({ code: "A" }); // x ñ';
    expect(
      tokenizeLine(line, "typescript")
        .map((token) => token.text)
        .join(""),
    ).toBe(line);
  });
});
