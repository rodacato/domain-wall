import type { CodeName } from "./CodeName";

export type NameStyle =
  "PascalCase" | "camelCase" | "snake_case" | "SCREAMING_SNAKE_CASE" | "kebab-case";

/** Lowercase words of a code name: "orderLineId" becomes ["order", "line", "id"]. */
export function splitIntoWords(codeName: CodeName): readonly string[] {
  const words = codeName.match(/[A-Z]?[a-z0-9]+/g) ?? [];
  return words.map((word) => word.toLowerCase());
}

/** Inverse of `snake_case` rendering, used to recover a code name from a language-specific code. */
export function splitSnakeCaseIntoWords(snakeCaseName: string): readonly string[] {
  return snakeCaseName.split("_").filter((word) => word.length > 0);
}

export function renderName(words: readonly string[], style: NameStyle): string {
  switch (style) {
    case "PascalCase":
      return words.map(capitalize).join("");
    case "camelCase":
      return words.map((word, position) => (position === 0 ? word : capitalize(word))).join("");
    case "snake_case":
      return words.join("_");
    case "SCREAMING_SNAKE_CASE":
      return words.join("_").toUpperCase();
    case "kebab-case":
      return words.join("-");
  }
}

export function renderCodeName(codeName: CodeName, style: NameStyle): string {
  return renderName(splitIntoWords(codeName), style);
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
