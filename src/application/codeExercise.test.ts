import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadTemplates as loadTemplateFiles } from "../../scripts/lib/loadTemplates";
import { TreeSitterSyntaxChecker } from "../adapters/syntax/TreeSitterSyntaxChecker";
import { PROGRAMMING_LANGUAGES } from "../domain/language/ProgrammingLanguage";
import { buildPackIndex } from "../domain/pack/PackIndex";
import { loadDefaultPack } from "../domain/pack/packFixtures";
import { evolveIndex } from "../domain/pack/patch/evolveIndex";
import {
  assembleSource,
  checkCodeAnswer,
  deriveCodeExercise,
  exerciseRunRequest,
} from "./codeExercise";
import type { TemplatesByLanguage } from "./loadTemplates";

const index = buildPackIndex(loadDefaultPack());
const evolved = evolveIndex(index);
const templates = Object.fromEntries(
  PROGRAMMING_LANGUAGES.map((language) => [language, loadTemplateFiles(language)]),
) as TemplatesByLanguage;
const modules = resolve("node_modules");
const checker = new TreeSitterSyntaxChecker({
  runtime: resolve(modules, "web-tree-sitter/web-tree-sitter.wasm"),
  grammars: {
    typescript: resolve(modules, "tree-sitter-typescript/tree-sitter-typescript.wasm"),
    python: resolve(modules, "tree-sitter-python/tree-sitter-python.wasm"),
    ruby: resolve(modules, "tree-sitter-ruby/tree-sitter-ruby.wasm"),
  },
});

describe("code exercises", () => {
  it.each(PROGRAMMING_LANGUAGES)(
    "%s: the reference solution of the rule exercise is plausible",
    async (language) => {
      const exercise = deriveCodeExercise("implementTheRule", index, evolved, language, templates);
      if (exercise === undefined) throw new Error("no exercise");

      const verdict = await checkCodeAnswer(exercise, exercise.reference, checker);

      expect(verdict.plausible).toBe(true);
    },
  );

  it.each(PROGRAMMING_LANGUAGES)(
    "%s: the reference solution of the change exercise is plausible",
    async (language) => {
      const exercise = deriveCodeExercise(
        "implementTheChange",
        index,
        evolved,
        language,
        templates,
      );
      if (exercise === undefined) throw new Error("no exercise");

      expect((await checkCodeAnswer(exercise, exercise.reference, checker)).plausible).toBe(true);
    },
  );

  it.each(PROGRAMMING_LANGUAGES)(
    "%s: the reference wiring of the pipeline step is plausible",
    async (language) => {
      const exercise = deriveCodeExercise("addPipelineStage", index, evolved, language, templates);
      if (exercise === undefined) throw new Error("no exercise");

      expect((await checkCodeAnswer(exercise, exercise.reference, checker)).plausible).toBe(true);
    },
  );

  it("puts the answer back exactly where the hole was", () => {
    const exercise = deriveCodeExercise(
      "implementTheRule",
      index,
      evolved,
      "typescript",
      templates,
    );
    if (exercise === undefined) throw new Error("no exercise");

    expect(assembleSource(exercise, exercise.reference)).toContain(exercise.reference);
    expect(assembleSource(exercise, exercise.reference).endsWith("\n")).toBe(true);
  });

  it("does not accept the placeholder, broken code or an answer that forgets the rule", async () => {
    const exercise = deriveCodeExercise("implementTheRule", index, evolved, "python", templates);
    if (exercise === undefined) throw new Error("no exercise");

    const untouched = await checkCodeAnswer(exercise, exercise.placeholder, checker);
    const broken = await checkCodeAnswer(exercise, "        if len(self._state.lines ==", checker);
    const forgetful = await checkCodeAnswer(exercise, "        pass", checker);

    expect(untouched.unfinished).toBe(true);
    expect(broken.issues.length).toBeGreaterThan(0);
    expect(forgetful.missing).toContain("OrderMustHaveLines");
    expect([untouched, broken, forgetful].some((verdict) => verdict.plausible)).toBe(false);
  });

  it.each(PROGRAMMING_LANGUAGES)(
    "%s: the reference body of the repository adapter is plausible",
    async (language) => {
      const exercise = deriveCodeExercise(
        "implementRepositoryAdapter",
        index,
        evolved,
        language,
        templates,
      );
      if (exercise === undefined) throw new Error("no exercise");

      expect((await checkCodeAnswer(exercise, exercise.reference, checker)).plausible).toBe(true);
    },
  );

  it("has no code exercise for the kinds that need no code", () => {
    expect(
      deriveCodeExercise("orderEvents", index, evolved, "typescript", templates),
    ).toBeUndefined();
  });
});

describe("running a code exercise for real", () => {
  it("sends every generated file with the answer in the one that had the hole", () => {
    const exercise = deriveCodeExercise("implementTheRule", index, evolved, "python", templates);
    if (exercise === undefined) throw new Error("no exercise");

    const request = exerciseRunRequest(exercise, exercise.reference, 5000);
    const changed = request.files.find((file) => file.path === exercise.path);

    expect(request.testEntry).toBe("run_tests.py");
    expect(request.files.length).toBe(exercise.files.length);
    expect(changed?.content).toBe(assembleSource(exercise, exercise.reference));
    expect(request.files.filter((file) => file !== changed).length).toBe(exercise.files.length - 1);
  });
});

describe("an answer that differs from the reference", () => {
  it("is accepted when it says the same thing with other words", async () => {
    const exercise = deriveCodeExercise(
      "implementTheRule",
      index,
      evolved,
      "typescript",
      templates,
    );
    if (exercise === undefined) throw new Error("no exercise");
    const answer =
      '    if (this.state.lines.length < 1) return err({ code: "OrderMustHaveLines" });';

    expect((await checkCodeAnswer(exercise, answer, checker)).plausible).toBe(true);
  });

  it("is refused when it reads none of the data the rule is about", async () => {
    const exercise = deriveCodeExercise(
      "implementTheRule",
      index,
      evolved,
      "typescript",
      templates,
    );
    if (exercise === undefined) throw new Error("no exercise");
    const answer = '    if (true) return err({ code: "OrderMustHaveLines" });';

    const verdict = await checkCodeAnswer(exercise, answer, checker);

    expect(verdict.plausible).toBe(false);
    expect(verdict.missing.join(" ")).toContain("lines");
  });
});
