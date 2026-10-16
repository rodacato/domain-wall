import type { PackIndex } from "../../domain/pack/PackIndex";
import { buildWorkflowView, type PortView } from "./buildWorkflowView";
import type { LanguageDescriptor } from "../languages/LanguageDescriptor";
import type { PlannedField, WorkflowTestPlan } from "../test-plan/WorkflowTestPlan";
import { renderValue, valueObjectsUsedBy } from "./buildTestViews";
import { fill } from "./fill";
import { namingFor } from "./LanguageNaming";
import { asNamedList, uniqueSorted } from "./referencedNames";
import { renderLiteral } from "./renderLiteral";

/** Stands for "no port is ever called", because the workflow stops before reaching any. */
const NEVER_CALLED = "<never called>";

export interface FakePortView {
  readonly member: string;
  readonly operation: string;
  readonly receipt: string;
  readonly code: string;
  readonly isOk: boolean;
  readonly isFailing: boolean;
  readonly isUnreachable: boolean;
  readonly last: boolean;
}

export interface WorkflowTestsView {
  readonly name: string;
  readonly functionName: string;
  readonly module: string;
  readonly errorType: string;
  readonly portsType: string;
  /** Everything a test imports from the workflow module, in alphabetical order. */
  readonly workflowImports: readonly { readonly name: string; readonly last: boolean }[];
  readonly inputType: string;
  readonly outputType: string;
  readonly valueObjectImports: readonly { readonly name: string; readonly last: boolean }[];
  readonly hasValueObjectImports: boolean;
  readonly validInput: string;
  readonly happyPorts: readonly FakePortView[];
  readonly computed: readonly { readonly name: string; readonly expected: string }[];
  readonly validationFailures: readonly {
    readonly slug: string;
    readonly input: string;
    readonly ports: readonly FakePortView[];
    readonly code: string;
  }[];
  readonly portFailures: readonly {
    readonly slug: string;
    readonly ports: readonly FakePortView[];
    readonly code: string;
  }[];
}

export function buildWorkflowTestsView(
  index: PackIndex,
  descriptor: LanguageDescriptor,
  plan: WorkflowTestPlan,
): WorkflowTestsView | undefined {
  const view = buildWorkflowView(index, descriptor);
  if (view === undefined) return undefined;
  const naming = namingFor(descriptor.id);
  const { syntax } = descriptor;
  const renderer = { index, descriptor, naming };

  const rawInput = (overrides: Readonly<Record<string, PlannedField["value"]>> = {}): string =>
    fill(syntax.expressions.constructRecord, {
      type: view.inputType,
      arguments: plan.input
        .map((field) =>
          fill(syntax.expressions.constructRecordArgument, {
            name: naming.member(field.name),
            value: renderLiteral(syntax, overrides[field.name] ?? field.value),
          }),
        )
        .join(", "),
    });

  const receiptOf = (port: PortView): string => {
    const planned = plan.receipts.find((receipt) => naming.member(receipt.port) === port.member);
    return fill(syntax.expressions.constructRecord, {
      type: port.receiptType,
      arguments: (planned?.fields ?? [])
        .map((field) =>
          fill(syntax.expressions.constructRecordArgument, {
            name: naming.member(field.name),
            value: renderValue(renderer, field.type, field.value),
          }),
        )
        .join(", "),
    });
  };

  /** `failing` is the port that answers with an error, null when all succeed, or NEVER_CALLED when the workflow never gets to call any. */
  const portsFor = (failing: string | null, code: string): readonly FakePortView[] => {
    const failingPosition = view.ports.findIndex((port) => port.member === failing);
    return view.ports.map((port, position) => {
      const isFailing = failingPosition === position;
      const isUnreachable =
        failing === "none" || (failingPosition !== -1 && position > failingPosition);
      return {
        member: port.member,
        operation: port.operation,
        receipt: receiptOf(port),
        code: isFailing ? naming.errorCode(code) : "",
        isOk: !isFailing && !isUnreachable,
        isFailing,
        isUnreachable,
        last: position === view.ports.length - 1,
      };
    });
  };

  const imported = uniqueSorted(
    [...plan.receipts.flatMap((receipt) => receipt.fields)].flatMap((field) =>
      valueObjectsUsedBy(index, field.type),
    ),
  );

  return {
    name: view.name,
    functionName: view.functionName,
    module: view.module,
    errorType: view.errorType,
    portsType: view.portsType,
    workflowImports: asNamedList(
      uniqueSorted([
        view.errorType,
        view.functionName,
        view.portsType,
        view.inputType,
        ...view.ports.map((port) => port.receiptType),
      ]),
    ),
    inputType: view.inputType,
    outputType: view.outputType,
    valueObjectImports: asNamedList(imported.map(naming.type)),
    hasValueObjectImports: imported.length > 0,
    validInput: rawInput(),
    happyPorts: portsFor(null, ""),
    computed: plan.computed.map((field) => ({
      name: naming.member(field.name),
      expected: renderLiteral(syntax, field.value),
    })),
    validationFailures: plan.validationFailures.map((failure) => ({
      slug: `rejects_invalid_${naming.snake(failure.field)}`,
      input: rawInput({ [failure.field]: failure.value }),
      ports: portsFor(NEVER_CALLED, ""),
      code: naming.errorCode(failure.code),
    })),
    portFailures: plan.portFailures.map((failure) => ({
      slug: `stops_when_${naming.snake(failure.code)}`,
      ports: portsFor(naming.member(failure.failingPort), failure.code),
      code: naming.errorCode(failure.code),
    })),
  };
}
