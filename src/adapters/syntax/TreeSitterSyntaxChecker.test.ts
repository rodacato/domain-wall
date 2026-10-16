import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TreeSitterSyntaxChecker } from "./TreeSitterSyntaxChecker";

const modules = resolve("node_modules");
const checker = new TreeSitterSyntaxChecker({
  runtime: resolve(modules, "web-tree-sitter/web-tree-sitter.wasm"),
  grammars: {
    typescript: resolve(modules, "tree-sitter-typescript/tree-sitter-typescript.wasm"),
    python: resolve(modules, "tree-sitter-python/tree-sitter-python.wasm"),
    ruby: resolve(modules, "tree-sitter-ruby/tree-sitter-ruby.wasm"),
  },
});

describe("the tree-sitter syntax checker", () => {
  it.each([
    [
      "typescript",
      "const total: number = 1;\nif (total > 0) {\n  total + 1;\n}\n",
      "const total: number = ;\n",
    ],
    ["python", "def total(x):\n    return x + 1\n", "def total(x:\n    return x +\n"],
    ["ruby", "def total(x)\n  x + 1\nend\n", "def total(x)\n  x +\n"],
    ["ruby-dry", "class A\n  def b = 1\nend\n", "class A\n  def b(\nend\n"],
  ] as const)(
    "accepts well-formed %s and reports the problem in broken code",
    async (language, good, bad) => {
      expect(await checker.check(language, good)).toEqual([]);
      const issues = await checker.check(language, bad);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.line).toBeGreaterThanOrEqual(1);
    },
  );

  it("points at the line where the code breaks", async () => {
    const issues = await checker.check("python", "x = 1\ny = (2 +\nz = 3\n");

    expect(issues.some((issue) => issue.line >= 2)).toBe(true);
  });
});
