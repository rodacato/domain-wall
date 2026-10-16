import type { PackIndex } from "../../domain/pack/PackIndex";
import type { Field } from "../../domain/pack/schema/Field";
import {
  portOfStage,
  shapeWorkflow,
  type ResolvedType,
  type ShapedStage,
} from "../../domain/pack/workflowShape";
import type { LanguageDescriptor } from "../languages/LanguageDescriptor";
import { fill } from "./fill";
import { namingFor, type LanguageNaming } from "./LanguageNaming";
import { asNamedList, referencedNames, uniqueSorted, withLast } from "./referencedNames";
import { renderTypedValue, type ExpressionContext } from "./renderExpression";
import { renderFieldType } from "./renderFieldType";

interface TypedName {
  readonly name: string;
  readonly type: string;
  readonly last: boolean;
}

export interface TypeView {
  readonly name: string;
  readonly anchor: string;
  readonly fields: readonly TypedName[];
}

export interface PortView {
  /** The type of the port and of the data it answers with. */
  readonly type: string;
  readonly receiptType: string;
  readonly receipt: readonly TypedName[];
  /** The name the port has in the object that carries every port of the workflow. */
  readonly member: string;
  readonly operation: string;
  readonly inputType: string;
  readonly anchor: string;
}

export interface Validation {
  readonly name: string;
  readonly type: string;
  readonly raw: string;
  readonly isScalar: boolean;
  readonly isEnum: boolean;
  readonly enumInvalid: string;
}

export interface StageView {
  readonly anchor: string;
  readonly function: string;
  readonly inputType: string;
  readonly outputType: string;
  readonly isValidate: boolean;
  readonly isCompute: boolean;
  readonly isPort: boolean;
  readonly errorCode: string;
  readonly validations: readonly Validation[];
  /** The fields of the type the stage returns, each with the code that builds it. */
  readonly outputs: readonly {
    readonly name: string;
    readonly value: string;
    readonly last: boolean;
  }[];
  readonly port: PortView | undefined;
}

export interface StepView {
  readonly anchor: string;
  /** The variable that holds the result of the stage, and the call that produces it. */
  readonly result: string;
  readonly call: string;
  readonly isLast: boolean;
}

export interface WorkflowView {
  readonly name: string;
  readonly functionName: string;
  readonly module: string;
  readonly anchor: string;
  readonly errorType: string;
  readonly errorCodes: readonly { readonly code: string; readonly last: boolean }[];
  readonly portsType: string;
  readonly inputType: string;
  readonly outputType: string;
  readonly valueObjectImports: readonly { readonly name: string; readonly last: boolean }[];
  readonly hasValueObjectImports: boolean;
  readonly types: readonly TypeView[];
  readonly ports: readonly PortView[];
  readonly stages: readonly StageView[];
  readonly steps: readonly StepView[];
}

interface Builder {
  readonly index: PackIndex;
  readonly descriptor: LanguageDescriptor;
  readonly naming: LanguageNaming;
  readonly workflowName: string;
}

function typedFields(builder: Builder, fields: readonly Field[]): readonly TypedName[] {
  const { index, descriptor, naming } = builder;
  return withLast(
    fields.map((field) => ({
      name: naming.member(field.codeName),
      type: renderFieldType(index, descriptor.syntax, naming, field.type),
    })),
  );
}

function portView(builder: Builder, entry: ShapedStage): PortView | undefined {
  const port = portOfStage(entry.stage);
  if (port === undefined) return undefined;
  const { naming } = builder;
  const receiptFields = entry.output.fields.filter((field) =>
    entry.output.added.includes(field.codeName),
  );
  return {
    type: naming.type(port.name),
    receiptType: `${naming.type(port.name)}Receipt`,
    receipt: typedFields(builder, receiptFields),
    member: naming.member(port.name),
    operation: naming.member(port.operation),
    inputType: naming.type(entry.input.codeName),
    anchor: `workflow.port.${port.name}`,
  };
}

function recordContext(builder: Builder, fields: readonly Field[]): ExpressionContext {
  const { index, descriptor, naming } = builder;
  const placeholder = index.pack.aggregates[0];
  if (placeholder === undefined) throw new Error("the pack has no aggregate");
  return {
    index,
    aggregate: placeholder,
    syntax: descriptor.syntax,
    naming,
    scope: { kind: "record", fields },
    self: "current",
    command: null,
  };
}

function inputField(builder: Builder, name: string): string {
  return fill(builder.descriptor.syntax.expressions.elementField, {
    element: "input",
    name: builder.naming.member(name),
  });
}

function validateStage(
  builder: Builder,
  entry: ShapedStage,
): Pick<StageView, "validations" | "outputs"> {
  const { index, descriptor, naming } = builder;
  const { syntax } = descriptor;
  const validations: Validation[] = [];
  const outputs = entry.output.fields.map((field) => {
    const raw = inputField(builder, field.codeName);
    const valueObject =
      field.type.kind === "valueObject" ? index.valueObjects.get(field.type.ref) : undefined;
    const name = naming.member(field.codeName);
    if (field.type.kind === "valueObject" && valueObject?.kind === "scalar") {
      validations.push({
        name,
        type: naming.type(field.type.ref),
        raw,
        isScalar: true,
        isEnum: false,
        enumInvalid: "",
      });
      return { name, value: fill(syntax.expressions.resultValue, { result: name }) };
    }
    if (field.type.kind === "valueObject" && valueObject?.kind === "enum") {
      const parameters = { type: naming.type(field.type.ref), value: raw };
      validations.push({
        name,
        type: parameters.type,
        raw,
        isScalar: false,
        isEnum: true,
        enumInvalid: fill(syntax.enumFromRaw.invalid, parameters),
      });
      return { name, value: fill(syntax.enumFromRaw.convert, parameters) };
    }
    return { name, value: raw };
  });
  return { validations, outputs: withLast(outputs) };
}

function computeStage(builder: Builder, entry: ShapedStage): Pick<StageView, "outputs"> {
  const { naming } = builder;
  const kind = entry.stage.kind;
  const context = recordContext(builder, entry.input.fields);
  const outputs = entry.output.fields.map((field) => {
    const assigned =
      kind.type === "compute"
        ? kind.assigns.find((assign) => assign.field === field.codeName)
        : undefined;
    const value =
      assigned === undefined
        ? inputField(builder, field.codeName)
        : renderTypedValue(context, assigned.expression, field.type);
    return { name: naming.member(field.codeName), value };
  });
  return { outputs: withLast(outputs) };
}

function portStage(builder: Builder, entry: ShapedStage): Pick<StageView, "outputs"> {
  const { naming, descriptor } = builder;
  const received = fill(descriptor.syntax.expressions.resultValue, { result: "received" });
  const outputs = entry.output.fields.map((field) => {
    const added = entry.output.added.includes(field.codeName);
    const member = naming.member(field.codeName);
    return {
      name: member,
      value: added
        ? fill(descriptor.syntax.expressions.elementField, { element: received, name: member })
        : inputField(builder, field.codeName),
    };
  });
  return { outputs: withLast(outputs) };
}

function stageView(builder: Builder, entry: ShapedStage): StageView {
  const { naming } = builder;
  const { stage } = entry;
  const base = {
    anchor: `workflow.stage.${stage.codeName}`,
    function: naming.member(stage.codeName),
    inputType: naming.type(entry.input.codeName),
    outputType: naming.type(entry.output.codeName),
    isValidate: stage.kind.type === "validate",
    isCompute: stage.kind.type === "compute",
    isPort: stage.kind.type === "callPort" || stage.kind.type === "commit",
    errorCode: naming.errorCode(stage.errors[0]?.codeName ?? ""),
    port: portView(builder, entry),
  };
  const none = { validations: [] as readonly Validation[] };
  if (stage.kind.type === "validate") return { ...base, ...validateStage(builder, entry) };
  if (stage.kind.type === "compute") return { ...base, ...none, ...computeStage(builder, entry) };
  return { ...base, ...none, ...portStage(builder, entry) };
}

function typeView(builder: Builder, type: ResolvedType): TypeView {
  return {
    name: builder.naming.type(type.codeName),
    anchor: `workflow.type.${type.codeName}`,
    fields: typedFields(builder, type.fields),
  };
}

export function buildWorkflowView(
  index: PackIndex,
  descriptor: LanguageDescriptor,
): WorkflowView | undefined {
  const shaped = shapeWorkflow(index);
  const first = shaped[0];
  const last = shaped[shaped.length - 1];
  if (first === undefined || last === undefined) return undefined;
  const { workflow } = index.pack;
  const naming = namingFor(descriptor.id);
  const builder: Builder = { index, descriptor, naming, workflowName: workflow.codeName };
  const name = naming.type(workflow.codeName);

  const types = [first.input, ...shaped.map((entry) => entry.output)].map((type) =>
    typeView(builder, type),
  );
  const stages = shaped.map((entry) => stageView(builder, entry));
  const ports = stages.flatMap((stage) => (stage.port === undefined ? [] : [stage.port]));

  const resultName = (type: string): string => naming.member(type);
  const resultValue = (result: string): string =>
    fill(descriptor.syntax.expressions.resultValue, { result });
  const steps = stages.map<StepView>((stage, position) => {
    const previous =
      position === 0
        ? "input"
        : resultValue(resultName(shaped[position - 1]?.output.codeName ?? ""));
    const portArgument = stage.port === undefined ? "" : `, ports.${stage.port.member}`;
    return {
      anchor: stage.anchor,
      result: resultName(shaped[position]?.output.codeName ?? ""),
      call: `${stage.function}(${previous}${portArgument})`,
      isLast: position === stages.length - 1,
    };
  });

  const codes = [
    ...new Set(shaped.flatMap((entry) => entry.stage.errors.map((error) => error.codeName))),
  ];
  const imported = uniqueSorted(
    [first.input, ...shaped.map((entry) => entry.output)].flatMap((type) =>
      type.fields.flatMap((field) => referencedNames(field.type)),
    ),
  ).filter((candidate) => index.valueObjects.has(candidate));

  return {
    name,
    functionName: naming.member(workflow.codeName),
    module: naming.module(workflow.codeName),
    anchor: `workflow.${workflow.codeName}`,
    errorType: `${name}Error`,
    errorCodes: withLast(codes.map((code) => ({ code: naming.errorCode(code) }))),
    portsType: `${name}Ports`,
    inputType: naming.type(first.input.codeName),
    outputType: naming.type(last.output.codeName),
    valueObjectImports: asNamedList(imported.map(naming.type)),
    hasValueObjectImports: imported.length > 0,
    types,
    ports,
    stages,
    steps,
  };
}
