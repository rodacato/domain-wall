import type { ProgrammingLanguageId } from "../../domain/language/ProgrammingLanguage";

export type TokenKind = "keyword" | "string" | "number" | "comment" | "type" | "symbol" | "plain";

export interface Token {
  readonly text: string;
  readonly kind: TokenKind;
}

const KEYWORDS: Readonly<Record<ProgrammingLanguageId, ReadonlySet<string>>> = {
  typescript: new Set(
    "as class const constructor declare else export extends from if import interface new private readonly return static type typeof unique symbol undefined let true false get this keyof never".split(
      " ",
    ),
  ),
  python: new Set(
    "and class def elif else from if import in is lambda None not or pass return self True False raise with as".split(
      " ",
    ),
  ),
  ruby: new Set(
    "begin class def do else elsif end if module nil private require_relative require return self true false unless while lambda yield".split(
      " ",
    ),
  ),
  "ruby-dry": new Set(
    "begin class def do else elsif end if module nil private require_relative require return self true false unless while lambda yield extend include".split(
      " ",
    ),
  ),
};

const COMMENT_MARKER: Readonly<Record<ProgrammingLanguageId, string>> = {
  typescript: "//",
  python: "#",
  ruby: "#",
  "ruby-dry": "#",
};

const TOKEN_PATTERN =
  /(?<string>"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(?<symbol>(?<![:\w]):[a-z_][a-zA-Z0-9_]*[?!]?)|(?<number>\b\d+\b)|(?<word>[A-Za-z_][A-Za-z0-9_]*[?!]?)/y;

function classifyWord(word: string, language: ProgrammingLanguageId): TokenKind {
  if (KEYWORDS[language].has(word)) return "keyword";
  return /^[A-Z]/.test(word) ? "type" : "plain";
}

function kindOfMatch(match: RegExpExecArray, language: ProgrammingLanguageId): TokenKind {
  const groups = match.groups ?? {};
  if (groups["string"] !== undefined) return "string";
  if (groups["symbol"] !== undefined) return "symbol";
  if (groups["number"] !== undefined) return "number";
  return classifyWord(match[0], language);
}

/** Splits one line of source into coloured pieces. A scanner, not a parser: enough to read code by. */
export function tokenizeLine(line: string, language: ProgrammingLanguageId): readonly Token[] {
  const tokens: Token[] = [];
  const marker = COMMENT_MARKER[language];
  let plain = "";
  let position = 0;

  const flushPlain = (): void => {
    if (plain !== "") tokens.push({ text: plain, kind: "plain" });
    plain = "";
  };

  while (position < line.length) {
    if (line.startsWith(marker, position)) {
      flushPlain();
      tokens.push({ text: line.slice(position), kind: "comment" });
      return tokens;
    }
    TOKEN_PATTERN.lastIndex = position;
    const match = TOKEN_PATTERN.exec(line);
    if (match === null) {
      plain += line.charAt(position);
      position += 1;
      continue;
    }
    const text = match[0];
    const kind = kindOfMatch(match, language);
    if (kind === "plain") {
      plain += text;
    } else {
      flushPlain();
      tokens.push({ text, kind });
    }
    position += text.length;
  }
  flushPlain();
  return tokens;
}
