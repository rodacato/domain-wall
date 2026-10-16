import type { PackIndex } from "../domain/pack/PackIndex";
import { err, ok, type Result } from "../domain/shared/Result";
import type { FileRole, GeneratedFile, GeneratedProject } from "./GeneratedProject";
import type { LanguageDescriptor, TemplateLibrary } from "./languages/LanguageDescriptor";
import { renderTemplate } from "./rendering/renderTemplate";
import { buildAggregateTestPlan, buildValueObjectTestPlans } from "./test-plan/buildTestPlan";
import { buildAggregateView, stateLiteral } from "./viewmodel/buildAggregateView";
import { buildEventsView } from "./viewmodel/buildEventsView";
import { buildAggregateTestsView, buildValueObjectTestsView } from "./viewmodel/buildTestViews";
import { buildValueObjectsView } from "./viewmodel/buildValueObjectsView";
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
  const addRendered = (path: string, role: FileRole, templateName: string, view: object): void => {
    const rendered = renderTemplate(template(templateName), { packId, ...view }, templateName);
    if (rendered.ok)
      files.push({ path, role, content: rendered.value.content, anchors: rendered.value.anchors });
    else problems.push(rendered.error);
  };

  for (const support of descriptor.supportFiles) {
    files.push({
      path: support.path,
      role: support.role,
      content: template(support.template),
      anchors: [],
    });
  }

  addRendered(
    descriptor.filePath(descriptor.moduleStem("ValueObjects"), "source"),
    "source",
    descriptor.templates.valueObjects,
    buildValueObjectsView(index, descriptor),
  );
  addRendered(
    descriptor.filePath(descriptor.moduleStem("Events"), "source"),
    "source",
    descriptor.templates.events,
    buildEventsView(index, descriptor),
  );
  addRendered(
    descriptor.filePath(descriptor.moduleStem("ValueObjects"), "test"),
    "test",
    descriptor.templates.valueObjectTests,
    buildValueObjectTestsView(descriptor, buildValueObjectTestPlans(index)),
  );

  const testedModules: { readonly module: string }[] = [];
  for (const aggregate of index.pack.aggregates) {
    const stem = descriptor.moduleStem(aggregate.codeName);
    addRendered(
      descriptor.filePath(stem, "source"),
      "source",
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
      descriptor.templates.aggregateTests,
      buildAggregateTestsView(index, descriptor, plan, (state) =>
        stateLiteral(descriptor, namingFor(descriptor.id), aggregate, state),
      ),
    );
    testedModules.push({ module: stem });
  }

  addRendered(descriptor.testEntry, "test", descriptor.templates.testRunner, {
    aggregates: testedModules,
  });

  if (problems.length > 0) return err(problems);
  return ok({ language: descriptor.id, files, entry: descriptor.testEntry });
}
