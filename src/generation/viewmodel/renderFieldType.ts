import type { FieldType } from "../../domain/pack/schema/FieldType";
import type { LanguageSyntax } from "../languages/LanguageDescriptor";
import { fill } from "./fill";
import type { LanguageNaming } from "./LanguageNaming";

export function renderFieldType(
  syntax: LanguageSyntax,
  naming: LanguageNaming,
  type: FieldType,
): string {
  switch (type.kind) {
    case "primitive":
      return syntax.types[type.name];
    case "valueObject":
    case "entity":
      return naming.type(type.ref);
    case "list":
      return fill(syntax.types.list, { element: renderFieldType(syntax, naming, type.of) });
    case "optional":
      return fill(syntax.types.optional, { inner: renderFieldType(syntax, naming, type.of) });
  }
}
