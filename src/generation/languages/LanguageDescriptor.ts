import type { ProgrammingLanguageId } from "../../domain/language/ProgrammingLanguage";
import type { ArithmeticOperator, ComparisonOperator } from "../../domain/pack/schema/Expression";
import type { FileRole } from "../GeneratedProject";

export type TypeReferences = Readonly<Record<"scalar" | "enum" | "record" | "entity", string>>;

export const REFERENCED_BY_NAME: TypeReferences = {
  scalar: "{{name}}",
  enum: "{{name}}",
  record: "{{name}}",
  entity: "{{name}}",
};

/** Small Mustache snippets for the syntax that differs between languages; skeletons live in template files. */
export interface LanguageSyntax {
  readonly types: {
    readonly string: string;
    readonly integer: string;
    readonly boolean: string;
    readonly date: string;
    readonly timestamp: string;
    /** Takes {{element}}. */
    readonly list: string;
    /** Takes {{inner}}. */
    readonly optional: string;
    /** How a type refers to a domain type of each kind; takes {{name}}. */
    readonly references: TypeReferences;
  };
  readonly literals: {
    readonly true: string;
    readonly false: string;
    readonly null: string;
    readonly emptyList: string;
  };
  /** Ruby reads "#{" inside double quotes as interpolation. */
  readonly escapesInterpolation: boolean;
  readonly expressions: {
    /** A stored field or state data; takes {{self}} and {{name}}. */
    readonly field: string;
    /** A derived value of the aggregate; takes {{self}} and {{name}}. */
    readonly derived: string;
    /** A field of the entity whose derived value is computed; takes {{name}}. */
    readonly entityField: string;
    /** A field of the element inside sumOf; takes {{element}} and {{name}}. */
    readonly elementField: string;
    readonly argument: string;
    readonly count: string;
    /** Takes {{collection}}, {{element}} and {{term}}. */
    readonly sumOf: string;
    readonly arithmetic: string;
    /** Takes {{type}} and {{arguments}}. */
    readonly constructEntity: string;
    readonly constructRecord: string;
    /** One argument of an entity construction, usually positional; takes {{name}} and {{value}}. */
    readonly constructEntityArgument: string;
    readonly constructRecordArgument: string;
    /** Wraps a computed number as a scalar value object without validating it. */
    readonly trusted: string;
    /** Adds an element to a list effect; takes {{current}} and {{value}}. */
    readonly append: string;
    /** Reads an optional value where a present one is required; takes {{value}}. */
    readonly assertPresent: string;
    /** The value held by a result that is known to have succeeded; takes {{result}}. */
    readonly resultValue: string;
    /** Lets two value objects with different brands be compared by their base type; takes {{value}} and {{base}}. */
    readonly widen: string;
  };
  /** Checks a raw text against an enum and turns it into the member; both take {{type}} and {{value}}. */
  readonly enumFromRaw: { readonly invalid: string; readonly convert: string };
  /** A state of an aggregate; takes {{name}}, {{snake}}, {{constant}} and {{aggregate}}. */
  readonly stateLiteral: string;
  readonly operators: {
    readonly arithmetic: Readonly<Record<ArithmeticOperator, string>>;
    readonly comparison: Readonly<Record<ComparisonOperator, string>>;
  };
  readonly predicates: {
    readonly present: string;
    readonly absent: string;
    readonly notEmpty: string;
    readonly empty: string;
    readonly allJoiner: string;
    readonly anyJoiner: string;
    readonly not: string;
    readonly group: string;
  };
  /** The condition under which a constraint is violated; patterns take {{pattern}}, {{anchored}} or {{wholeString}}. */
  readonly constraints: {
    readonly minLength: string;
    readonly maxLength: string;
    readonly min: string;
    readonly max: string;
    readonly pattern: string;
  };
  /** How test code builds a value of each kind. */
  readonly values: {
    readonly scalarValueObject: string;
    /** Takes {{type}} and the member spelled {{member}} (PascalCase), {{snake}} or {{constant}}. */
    readonly enumMember: string;
    /** A list of values; takes {{items}}, already joined with commas. */
    readonly list: string;
    readonly record: string;
    readonly recordField: string;
    readonly absent: string;
    /** One argument of a command or start call, positional or keyword; takes {{name}} and {{value}}. */
    readonly callArgument: string;
  };
  readonly selfNames: { readonly current: string; readonly next: string };
}

export interface SupportFile {
  readonly path: string;
  readonly role: FileRole;
  readonly template: string;
}

export interface LanguageDescriptor {
  readonly id: ProgrammingLanguageId;
  readonly syntax: LanguageSyntax;
  readonly templates: {
    readonly valueObjects: string;
    readonly events: string;
    readonly aggregate: string;
    readonly valueObjectTests: string;
    readonly aggregateTests: string;
    readonly workflow: string;
    readonly workflowTests: string;
    readonly adapter: string;
    readonly adapterTests: string;
    readonly testRunner: string;
  };
  readonly supportFiles: readonly SupportFile[];
  readonly filePath: (stem: string, role: FileRole) => string;
  /** The module name other files import, derived from a code name. */
  readonly moduleStem: (codeName: string) => string;
  readonly testEntry: string;
}

/** Template files of one language, by name without extension. */
export type TemplateLibrary = Readonly<Record<string, string>>;
