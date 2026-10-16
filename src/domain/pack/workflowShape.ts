import type { PackIndex } from "./PackIndex";
import type { Field } from "./schema/Field";
import type { IntermediateType, Stage } from "./schema/Workflow";

/** A workflow type with every field it has, and which of them it adds to the type before it. */
export interface ResolvedType {
  readonly codeName: string;
  readonly fields: readonly Field[];
  readonly added: readonly string[];
}

export interface ShapedStage {
  readonly stage: Stage;
  readonly input: ResolvedType;
  readonly output: ResolvedType;
}

function fieldsOf(
  type: IntermediateType,
  types: ReadonlyMap<string, IntermediateType>,
  seen: ReadonlySet<string> = new Set(),
): readonly Field[] {
  if (seen.has(type.codeName)) return type.fields;
  const parent = type.extends === null ? undefined : types.get(type.extends);
  const inherited =
    parent === undefined ? [] : fieldsOf(parent, types, new Set([...seen, type.codeName]));
  return [...inherited, ...type.fields];
}

/** The stages of the pack's workflow with their input and output types fully spelled out. */
export function shapeWorkflow(index: PackIndex): readonly ShapedStage[] {
  const { workflow } = index.pack;
  const types = new Map<string, IntermediateType>(
    workflow.intermediateTypes.map((type) => [type.codeName, type]),
  );
  const resolve = (name: string, before: ResolvedType | null): ResolvedType => {
    const type = types.get(name);
    if (type === undefined) return { codeName: name, fields: [], added: [] };
    const fields = fieldsOf(type, types);
    const known = new Set(before?.fields.map((field) => field.codeName) ?? []);
    return {
      codeName: name,
      fields,
      added: fields.map((field) => field.codeName).filter((field) => !known.has(field)),
    };
  };
  return workflow.stages.map((stage) => {
    const input = resolve(stage.input, null);
    return { stage, input, output: resolve(stage.output, input) };
  });
}

/** The port a stage calls: the one the pack declares, or one implied by the commit stage; undefined for stages that call nothing. */
export function portOfStage(
  stage: Stage,
): { readonly name: string; readonly operation: string } | undefined {
  switch (stage.kind.type) {
    case "callPort":
      return { name: stage.kind.port.codeName, operation: stage.kind.port.operation };
    case "commit":
      return { name: `${stage.codeName}Port`, operation: "commit" };
    case "validate":
    case "compute":
      return undefined;
  }
}
