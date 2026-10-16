import type { LanguageDescriptor } from "./LanguageDescriptor";

/** The language with the changes that turn the rich aggregate into plain data read and changed by functions. */
export function anemicDescriptorOf(descriptor: LanguageDescriptor): LanguageDescriptor {
  return {
    ...descriptor,
    syntax: {
      ...descriptor.syntax,
      expressions: {
        ...descriptor.syntax.expressions,
        field: "{{self}}.{{name}}",
        derived: "{{name}}({{self}})",
        constructEntity: descriptor.syntax.expressions.constructRecord,
        constructEntityArgument: descriptor.syntax.expressions.constructRecordArgument,
      },
      entityDerivedAsFields: true,
      selfNames: { current: "data", next: "data" },
    },
  };
}
