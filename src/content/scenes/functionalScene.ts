import type { PackIndex } from "../../domain/pack/PackIndex";
import { shapeWorkflow } from "../../domain/pack/workflowShape";
import type { LookAtNote, NarrationFocus, Scene, SceneStep } from "../../domain/wall/Scene";
import { conceptId, moduleId } from "./sceneIds";

function lookAt(note: LookAtNote, subject: string | null = null): NarrationFocus {
  return { kind: "lookAt", note, subject };
}

/** The value object the validation stage builds that reads best as a constrained type, preferring a pattern. */
function constrainedTypeOfWorkflow(index: PackIndex): string | null {
  const stages = shapeWorkflow(index);
  const validated = stages.find((entry) => entry.stage.kind.type === "validate")?.output.fields;
  const scalars = (validated ?? []).flatMap((field) => {
    if (field.type.kind !== "valueObject") return [];
    const valueObject = index.valueObjects.get(field.type.ref);
    return valueObject?.kind === "scalar" && valueObject.constraints.length > 0
      ? [valueObject]
      : [];
  });
  const withPattern = scalars.find((valueObject) =>
    valueObject.constraints.some((constraint) => constraint.kind === "pattern"),
  );
  return (withPattern ?? scalars[0])?.codeName ?? null;
}

/** Module 8: the same domain seen as a pipeline of types, with errors travelling as values on a second track. */
export function buildFunctionalScene(index: PackIndex): Scene {
  const constrained = constrainedTypeOfWorkflow(index);
  const failing = index.pack.workflow.stages.find(
    (stage) => stage.kind.type === "callPort" && stage.errors.length > 0,
  );
  const firstError = failing?.errors[0];
  const failure =
    failing === undefined || firstError === undefined
      ? {}
      : { [failing.codeName]: firstError.codeName };

  const shaped = shapeWorkflow(index);
  const workflowType = `workflow.type.${shaped[2]?.output.codeName ?? shaped[0]?.output.codeName ?? ""}`;
  const pipelineRef = `workflow.${index.pack.workflow.codeName}`;
  const failingStageRef = `workflow.stage.${failing?.codeName ?? index.pack.workflow.stages[0]?.codeName ?? ""}`;

  const steps: SceneStep[] = [
    {
      id: "constrained-types",
      concept: conceptId("functional.constrained-types"),
      dialogue: null,
      focus: lookAt("constrainedTypes", constrained === null ? null : `valueObject.${constrained}`),
      commands: [
        {
          kind: "showCode",
          level: "code",
          unit: { kind: "valueObjects" },
          ...(constrained === null ? {} : { focus: `valueObject.${constrained}` }),
        },
      ],
    },
    {
      id: "states-as-types",
      concept: conceptId("functional.states-as-types"),
      dialogue: null,
      focus: lookAt("statesAsTypes"),
      commands: [{ kind: "showPipeline", view: "types" }],
    },
    {
      id: "states-as-types-code",
      concept: conceptId("functional.states-as-types"),
      dialogue: null,
      focus: lookAt("statesAsTypesCode", workflowType),
      commands: [
        { kind: "showCode", level: "code", unit: { kind: "workflow" }, focus: workflowType },
      ],
    },
    {
      id: "illegal-states",
      concept: conceptId("functional.illegal-states"),
      dialogue: null,
      focus: lookAt("illegalStates"),
      commands: [{ kind: "showPipeline", view: "mismatch" }],
    },
    {
      id: "pipeline",
      concept: conceptId("functional.pipeline"),
      dialogue: "functional.pipeline",
      focus: lookAt("pipeline"),
      commands: [{ kind: "showPipeline", view: "run" }],
    },
    {
      id: "pipeline-code",
      concept: conceptId("functional.pipeline"),
      dialogue: null,
      focus: lookAt("pipelineCode", pipelineRef),
      commands: [
        { kind: "showCode", level: "code", unit: { kind: "workflow" }, focus: pipelineRef },
      ],
    },
    {
      id: "errors-as-values",
      concept: conceptId("functional.errors-as-values"),
      dialogue: null,
      focus: lookAt("errorsAsValues"),
      commands: [{ kind: "showPipeline", view: "run", failures: failure, interactive: true }],
    },
    {
      id: "errors-as-values-code",
      concept: conceptId("functional.errors-as-values"),
      dialogue: null,
      focus: lookAt("errorsAsValuesCode", failingStageRef),
      commands: [
        { kind: "showCode", level: "code", unit: { kind: "workflow" }, focus: failingStageRef },
      ],
    },
  ];

  return {
    id: "functional-modeling",
    module: moduleId("functional-modeling"),
    prelude: [{ kind: "clearWall" }],
    steps,
  };
}
