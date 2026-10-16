import type { Literal } from "../../domain/pack/schema/Literal";
import type { LanguageSyntax } from "../languages/LanguageDescriptor";

/** A double-quoted string literal; JSON escaping is valid in TypeScript, Python and Ruby. */
export function renderString(syntax: LanguageSyntax, text: string): string {
  const quoted = JSON.stringify(text);
  return syntax.escapesInterpolation ? quoted.replaceAll("#", "\\#") : quoted;
}

export function renderLiteral(syntax: LanguageSyntax, value: Literal): string {
  if (value === null) return syntax.literals.null;
  if (typeof value === "boolean") return value ? syntax.literals.true : syntax.literals.false;
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return renderString(syntax, value);
  return Array.isArray(value)
    ? `[${value.map((item) => renderLiteral(syntax, item)).join(", ")}]`
    : JSON.stringify(value);
}
