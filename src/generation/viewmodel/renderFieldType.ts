import type { PackIndex } from "../../domain/pack/PackIndex";
import type { FieldType } from "../../domain/pack/schema/FieldType";
import type { LanguageSyntax } from "../languages/LanguageDescriptor";
import { fill } from "./fill";
import type { LanguageNaming } from "./LanguageNaming";

export function renderFieldType(
  index: PackIndex,
  syntax: LanguageSyntax,
  naming: LanguageNaming,
  type: FieldType,
): string {
  switch (type.kind) {
    case "primitive":
      return syntax.types[type.name];
    case "valueObject": {
      const kind = index.valueObjects.get(type.ref)?.kind ?? "record";
      return fill(syntax.types.references[kind], { name: naming.type(type.ref) });
    }
    case "entity":
      return fill(syntax.types.references.entity, { name: naming.type(type.ref) });
    case "list":
      return fill(syntax.types.list, {
        element: renderFieldType(index, syntax, naming, type.of),
      });
    case "optional":
      return fill(syntax.types.optional, {
        inner: renderFieldType(index, syntax, naming, type.of),
      });
  }
}
