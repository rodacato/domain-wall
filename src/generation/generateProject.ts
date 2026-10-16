import type { PackIndex } from "../domain/pack/PackIndex";
import { err, ok, type Result } from "../domain/shared/Result";
import type { CodeUnit } from "../domain/wall/CodeStage";
import type { FileRole, GeneratedFile, GeneratedProject } from "./GeneratedProject";
import type { LanguageDescriptor, TemplateLibrary } from "./languages/LanguageDescriptor";
import { renderTemplate } from "./rendering/renderTemplate";
import { buildAggregateTestPlan, buildValueObjectTestPlans } from "./test-plan/buildTestPlan";
import { buildWorkflowTestPlan } from "./test-plan/buildWorkflowTestPlan";
import { buildAdapterTestsView, buildAdapterView } from "./viewmodel/buildAdapterViews";
import { buildAggregateView, stateLiteral } from "./viewmodel/buildAggregateView";
import { buildEventsView } from "./viewmodel/buildEventsView";
import { buildAggregateTestsView, buildValueObjectTestsView } from "./viewmodel/buildTestViews";
import { buildValueObjectsView } from "./viewmodel/buildValueObjectsView";
import { buildWorkflowTestsView } from "./viewmodel/buildWorkflowTestsView";
import { buildWorkflowView } from "./viewmodel/buildWorkflowView";
import { namingFor } from "./viewmodel/LanguageNaming";

/** Generates the domain code and its tests for a pack in one programming language. */
export function generateProject(
  index: PackIndex,
  descriptor: LanguageDescriptor,
  templates: TemplateLibrary,
): Result<GeneratedProject, readonly string[]> {
  const files: GeneratedFile[] = [];
  const problems: string[] = [];
  const packId = index.pack.meta.packId;

  const template = (name: string): string => {
    const found = templates[name];
    if (found === undefined) problems.push(`missing template "${name}" for ${descriptor.id}`);
    return found ?? "";
  };
  const addRendered = (
    path: string,
    role: FileRole,
    unit: CodeUnit | null,
    templateName: string,
    view: object,
  ): void => {
    const rendered = renderTemplate(template(templateName), { packId, ...view }, templateName);
    if (rendered.ok) {
      files.push({
        path,
        role,
        content: rendered.value.content,
        anchors: rendered.value.anchors,
        unit,
      });
    } else problems.push(rendered.error);
  };

  for (const support of descriptor.supportFiles) {
    files.push({
      path: support.path,
      role: support.role,
      content: template(support.template),
      anchors: [],
      unit: null,
    });
  }

  addRendered(
    descriptor.filePath(descriptor.moduleStem("ValueObjects"), "source"),
    "source",
    { kind: "valueObjects" },
    descriptor.templates.valueObjects,
    buildValueObjectsView(index, descriptor),
  );
  addRendered(
    descriptor.filePath(descriptor.moduleStem("Events"), "source"),
    "source",
    { kind: "events" },
    descriptor.templates.events,
    buildEventsView(index, descriptor),
  );
  addRendered(
    descriptor.filePath(descriptor.moduleStem("ValueObjects"), "test"),
    "test",
    null,
    descriptor.templates.valueObjectTests,
    buildValueObjectTestsView(descriptor, buildValueObjectTestPlans(index)),
  );

  const testedModules: { readonly module: string }[] = [];
  for (const aggregate of index.pack.aggregates) {
    const stem = descriptor.moduleStem(aggregate.codeName);
    addRendered(
      descriptor.filePath(stem, "source"),
      "source",
      { kind: "aggregate", aggregate: aggregate.codeName },
      descriptor.templates.aggregate,
      buildAggregateView(index, descriptor, aggregate),
    );

    const plan = buildAggregateTestPlan(index, aggregate);
    if (plan === undefined) {
      problems.push(
        `cannot plan tests for ${aggregate.codeName}: its walkthrough or scenarios do not play`,
      );
      continue;
    }
    addRendered(
      descriptor.filePath(stem, "test"),
      "test",
      null,
      descriptor.templates.aggregateTests,
      buildAggregateTestsView(index, descriptor, plan, (state) =>
        stateLiteral(descriptor, namingFor(descriptor.id), aggregate, state),
      ),
    );
    testedModules.push({ module: stem });

    const adapterView = buildAdapterView(index, descriptor, aggregate);
    const adapterTestsView = buildAdapterTestsView(index, descriptor, aggregate, plan, (state) =>
      stateLiteral(descriptor, namingFor(descriptor.id), aggregate, state),
    );
    if (adapterView !== undefined && adapterTestsView !== undefined) {
      const adapterStem = descriptor.moduleStem(adapterView.name);
      addRendered(
        descriptor.filePath(adapterStem, "source"),
        "source",
        { kind: "adapter", aggregate: aggregate.codeName },
        descriptor.templates.adapter,
        adapterView,
      );
      addRendered(
        descriptor.filePath(adapterStem, "test"),
        "test",
        null,
        descriptor.templates.adapterTests,
        adapterTestsView,
      );
      testedModules.push({ module: adapterStem });
    }
  }

  const workflowView = buildWorkflowView(index, descriptor);
  const workflowPlan = buildWorkflowTestPlan(index);
  const workflowTestsView =
    workflowPlan === undefined
      ? undefined
      : buildWorkflowTestsView(index, descriptor, workflowPlan);
  if (workflowView === undefined || workflowTestsView === undefined) {
    problems.push("the workflow cannot be planned");
  } else {
    const stem = descriptor.moduleStem(index.pack.workflow.codeName);
    addRendered(
      descriptor.filePath(stem, "source"),
      "source",
      { kind: "workflow" },
      descriptor.templates.workflow,
      workflowView,
    );
    addRendered(
      descriptor.filePath(stem, "test"),
      "test",
      null,
      descriptor.templates.workflowTests,
      workflowTestsView,
    );
    testedModules.push({ module: stem });
  }

  addRendered(descriptor.testEntry, "test", null, descriptor.templates.testRunner, {
    aggregates: testedModules,
  });

  if (problems.length > 0) return err(problems);
  return ok({ language: descriptor.id, files, entry: descriptor.testEntry });
}
