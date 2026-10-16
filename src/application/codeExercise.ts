import type { ExerciseKind } from "../domain/course/Syllabus";
import type { CodeUnit } from "../domain/wall/CodeStage";
import type { ProgrammingLanguageId } from "../domain/language/ProgrammingLanguage";
import { heroAggregate } from "../domain/pack/heroAggregate";
import type { PackIndex } from "../domain/pack/PackIndex";
import { namingFor } from "../generation/viewmodel/LanguageNaming";
import type { CodeRunner, RunRequest } from "../ports/CodeRunner";
import type { SyntaxChecker, SyntaxIssue } from "../ports/SyntaxChecker";
import { sourceFileOf } from "./codeView";
import { generateCode } from "./generateCode";
import type { TemplatesByLanguage } from "./loadTemplates";

/** A piece of generated code with a hole the learner fills in. */
export interface CodeExercise {
  readonly kind: ExerciseKind;
  readonly language: ProgrammingLanguageId;
  readonly path: string;
  /** Every file of the generated project and the one that runs its tests, to run the exercise for real. */
  readonly files: readonly { readonly path: string; readonly content: string }[];
  readonly entry: string;
  /** The anchor reference of the concept the hole implements. */
  readonly anchorRef: string;
  /** Whether the code comes from the model after the evolution. */
  readonly forEvolvedModel: boolean;
  /** The code before the hole, and after it, each ending where the hole begins or begins after it. */
  readonly before: string;
  readonly after: string;
  /** What the generator wrote in the hole. */
  readonly reference: string;
  /** What a plausible answer mentions: the error code of the rule and the data it reads. */
  readonly required: readonly string[];
  /** Of these, a correct answer mentions at least one: the data a rule reads can be named in more than one way. */
  readonly oneOf: readonly string[];
  /** The hole as the learner first sees it: the indentation and a note saying what to do. */
  readonly placeholder: string;
}

export interface CodeVerdict {
  readonly issues: readonly SyntaxIssue[];
  /** Things a correct answer must mention and this one does not. */
  readonly missing: readonly string[];
  readonly unfinished: boolean;
  /** The syntax is valid and the answer mentions what it must. */
  readonly plausible: boolean;
}

const TODO_MARKER = "TODO";
const COMMENT_MARKER: Readonly<Record<ProgrammingLanguageId, string>> = {
  typescript: "//",
  python: "#",
  ruby: "#",
  "ruby-dry": "#",
};
const GENERIC_WORDS = new Set([
  "if",
  "return",
  "err",
  "code",
  "this",
  "self",
  "state",
  "_state",
  "length",
  "len",
  "upcoming",
  "next",
  "reject",
  "unless",
  "nil",
  "none",
  "true",
  "false",
  "empty",
  "not",
  "is",
  "end",
  "then",
  "do",
  "def",
  "undefined",
  "null",
  "none",
  "error",
]);

function identifiersIn(text: string): readonly string[] {
  const words = text.replace(/"[^"]*"/g, "").match(/\b[a-z_][A-Za-z0-9_]*\b/g) ?? [];
  return [...new Set(words.filter((word) => !GENERIC_WORDS.has(word.toLowerCase())))];
}

interface Source {
  /** The pack whose code has the hole: the original, or the one after the evolution. */
  readonly index: PackIndex;
  readonly unit: CodeUnit;
  /** References of the anchor that marks the hole; the first that exists in the code is used. */
  readonly anchors: readonly string[];
  /** The error code a correct answer returns, for exercises about a rule. */
  readonly errorCode: string | null;
}

function ruleSource(index: PackIndex, aggregate: string, rule: string): Source {
  return {
    index,
    unit: { kind: "aggregate", aggregate },
    anchors: [`${aggregate}.rule.${rule}`, `${aggregate}.invariant.${rule}`],
    errorCode: rule,
  };
}

function sourceFor(
  kind: ExerciseKind,
  index: PackIndex,
  evolved: PackIndex | undefined,
): Source | undefined {
  if (kind === "implementTheRule") {
    const aggregate = heroAggregate(index);
    const rule = aggregate?.transitions.flatMap((transition) => transition.guards)[0];
    return aggregate === undefined || rule === undefined
      ? undefined
      : ruleSource(index, aggregate.codeName, rule);
  }
  if (kind === "implementTheChange" && evolved !== undefined) {
    for (const operation of index.pack.changeScenarios.evolution.patch) {
      if (operation.op === "addRule") {
        return ruleSource(evolved, operation.aggregate, operation.rule.codeName);
      }
    }
  }
  if (kind === "implementRepositoryAdapter") {
    const aggregate = heroAggregate(index);
    return aggregate === undefined
      ? undefined
      : {
          index,
          unit: { kind: "adapter", aggregate: aggregate.codeName },
          anchors: [`${aggregate.codeName}.adapter.save`],
          errorCode: null,
        };
  }
  if (kind === "addPipelineStage") {
    const stage = index.pack.workflow.stages[1];
    return stage === undefined
      ? undefined
      : {
          index,
          unit: { kind: "workflow" },
          anchors: [`workflow.step.${stage.codeName}`],
          errorCode: null,
        };
  }
  return undefined;
}

/** The exercise of a kind that is written in code: generated code with one piece taken out. */
export function deriveCodeExercise(
  kind: ExerciseKind,
  index: PackIndex,
  evolved: PackIndex | undefined,
  language: ProgrammingLanguageId,
  templates: TemplatesByLanguage,
): CodeExercise | undefined {
  const source = sourceFor(kind, index, evolved);
  if (source === undefined) return undefined;
  const generated = generateCode(source.index, language, templates);
  if (!generated.ok) return undefined;
  const file = sourceFileOf(generated.value, source.unit);
  const anchor = file?.anchors.find((candidate) => source.anchors.includes(candidate.ref));
  if (file === undefined || anchor === undefined) return undefined;

  const lines = file.content.replace(/\n$/, "").split("\n");
  const hole = lines.slice(anchor.startLine - 1, anchor.endLine);
  const indentation = /^\s*/.exec(hole[0] ?? "")?.[0] ?? "";
  const reference = hole.join("\n");
  const code = source.errorCode === null ? [] : [namingFor(language).errorCode(source.errorCode)];
  return {
    kind,
    language,
    path: file.path,
    files: generated.value.files.map(({ path, content }) => ({ path, content })),
    entry: generated.value.entry,
    anchorRef: anchor.ref,
    forEvolvedModel: source.index !== index,
    before: `${lines.slice(0, anchor.startLine - 1).join("\n")}\n`,
    after: `${lines.slice(anchor.endLine).join("\n")}\n`,
    reference,
    required: source.errorCode === null ? identifiersIn(reference) : code,
    oneOf: source.errorCode === null ? [] : identifiersIn(reference),
    placeholder: `${indentation}${COMMENT_MARKER[language]} ${TODO_MARKER}: write the code here`,
  };
}

/** The whole file with the learner's answer in the hole. */
export function assembleSource(exercise: CodeExercise, answer: string): string {
  return `${exercise.before}${answer.replace(/\n+$/, "")}\n${exercise.after}`;
}

/** The line, in the assembled file, where the answer starts. */
export function answerStartLine(exercise: CodeExercise): number {
  return exercise.before.split("\n").length;
}

/** Judges an answer without running it: is it well formed, and does it mention what a correct one must. */
export async function checkCodeAnswer(
  exercise: CodeExercise,
  answer: string,
  checker: SyntaxChecker,
): Promise<CodeVerdict> {
  const unfinished = answer.includes(TODO_MARKER) || answer.trim() === "";
  const issues = await checker.check(exercise.language, assembleSource(exercise, answer));
  const missing = exercise.required.filter((token) => !mentions(answer, token));
  if (exercise.oneOf.length > 0 && !exercise.oneOf.some((token) => mentions(answer, token))) {
    missing.push(exercise.oneOf.join(" | "));
  }
  return {
    issues,
    missing,
    unfinished,
    plausible: !unfinished && issues.length === 0 && missing.length === 0,
  };
}

export type { SyntaxChecker, SyntaxIssue };

/** The project to run: every generated file, with the learner's answer in the one that had the hole. */
export function exerciseRunRequest(
  exercise: CodeExercise,
  answer: string,
  timeoutMs: number,
): RunRequest {
  return {
    language: exercise.language,
    files: exercise.files.map((file) =>
      file.path === exercise.path ? { ...file, content: assembleSource(exercise, answer) } : file,
    ),
    testEntry: exercise.entry,
    timeoutMs,
  };
}

export type { CodeRunner, RunRequest };

/** Whether the answer uses the name as a word of its own, not as a piece of a longer one. */
function mentions(answer: string, token: string): boolean {
  return new RegExp(
    `(?<![A-Za-z0-9_])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9_])`,
  ).test(answer);
}
