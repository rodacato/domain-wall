import { Language, Parser, type Node } from "web-tree-sitter";
import type { ProgrammingLanguageId } from "../../domain/language/ProgrammingLanguage";
import type { SyntaxChecker, SyntaxIssue } from "../../ports/SyntaxChecker";

/** Where the wasm files live: URLs in the browser, file paths under Node. */
export interface TreeSitterAssets {
  readonly runtime: string;
  readonly grammars: Readonly<Record<"typescript" | "python" | "ruby", string>>;
}

const GRAMMAR_OF: Readonly<Record<ProgrammingLanguageId, keyof TreeSitterAssets["grammars"]>> = {
  typescript: "typescript",
  python: "python",
  ruby: "ruby",
  "ruby-dry": "ruby",
};

const MAXIMUM_SNIPPET = 40;

function issuesOf(node: Node): SyntaxIssue[] {
  if (node.isMissing) {
    return [
      {
        line: node.startPosition.row + 1,
        column: node.startPosition.column + 1,
        kind: "missing",
        snippet: node.type,
      },
    ];
  }
  if (node.isError) {
    return [
      {
        line: node.startPosition.row + 1,
        column: node.startPosition.column + 1,
        kind: "unexpected",
        snippet: node.text.slice(0, MAXIMUM_SNIPPET),
      },
    ];
  }
  if (!node.hasError) return [];
  return node.children.flatMap((child) => issuesOf(child));
}

/** Checks syntax with tree-sitter compiled to WebAssembly; grammars load the first time a language is checked. */
export class TreeSitterSyntaxChecker implements SyntaxChecker {
  private parser: Promise<Parser> | undefined;
  private readonly languages = new Map<string, Promise<Language>>();

  constructor(private readonly assets: TreeSitterAssets) {}

  private async parserFor(): Promise<Parser> {
    this.parser ??= Parser.init({ locateFile: () => this.assets.runtime }).then(() => new Parser());
    return this.parser;
  }

  private languageFor(grammar: keyof TreeSitterAssets["grammars"]): Promise<Language> {
    const known = this.languages.get(grammar);
    if (known !== undefined) return known;
    const loaded = Language.load(this.assets.grammars[grammar]);
    this.languages.set(grammar, loaded);
    return loaded;
  }

  async check(language: ProgrammingLanguageId, source: string): Promise<readonly SyntaxIssue[]> {
    const parser = await this.parserFor();
    parser.setLanguage(await this.languageFor(GRAMMAR_OF[language]));
    const tree = parser.parse(source);
    if (tree === null) return [{ line: 1, column: 1, kind: "unexpected", snippet: "" }];
    const issues = issuesOf(tree.rootNode);
    tree.delete();
    return issues;
  }
}
