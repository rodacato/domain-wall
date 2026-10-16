import type { FieldType } from "../../domain/pack/schema/FieldType";

/** Names of the value objects and entities a type mentions, in order of appearance. */
export function referencedNames(type: FieldType): readonly string[] {
  switch (type.kind) {
    case "primitive":
      return [];
    case "valueObject":
    case "entity":
      return [type.ref];
    case "list":
    case "optional":
      return referencedNames(type.of);
  }
}

export function uniqueSorted(names: readonly string[]): readonly string[] {
  return [...new Set(names)].sort();
}

/** Names as template list items, so a template can write `{{name}}` with separators between them. */
export function asNamedList(
  names: readonly string[],
): readonly { readonly name: string; readonly last: boolean }[] {
  return withLast(names.map((name) => ({ name })));
}

/** Marks the last item so a template can put separators between items without a trailing one. */
export function withLast<Item extends object>(
  items: readonly Item[],
): readonly (Item & { readonly last: boolean })[] {
  return items.map((item, position) => ({ ...item, last: position === items.length - 1 }));
}
