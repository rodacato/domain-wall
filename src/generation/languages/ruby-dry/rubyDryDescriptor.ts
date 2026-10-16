import type { LanguageDescriptor } from "../LanguageDescriptor";
import { rubyDescriptor } from "../ruby/rubyDescriptor";

export const rubyDryDescriptor: LanguageDescriptor = {
  ...rubyDescriptor,
  id: "ruby-dry",
  syntax: {
    ...rubyDescriptor.syntax,
    expressions: { ...rubyDescriptor.syntax.expressions, resultValue: "{{result}}.value!" },
    enumFromRaw: { invalid: "!{{type}}::Type.valid?({{value}})", convert: "{{value}}" },
    types: {
      string: "Types::Strict::String",
      integer: "Types::Strict::Integer",
      boolean: "Types::Strict::Bool",
      date: "Types::Strict::String",
      timestamp: "Types::Strict::String",
      list: "Types::Strict::Array.of({{element}})",
      optional: "{{inner}}.optional",
      references: {
        scalar: "{{name}}::Type",
        enum: "{{name}}::Type",
        record: "{{name}}",
        entity: "{{name}}",
      },
    },
  },
  supportFiles: [
    { path: "types.rb", role: "support", template: "types" },
    { path: "testing.rb", role: "support", template: "testing" },
  ],
};
