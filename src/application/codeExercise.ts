import type { ExerciseKind } from "../domain/course/Syllabus";
import type { ProgrammingLanguageId } from "../domain/language/ProgrammingLanguage";
import { heroAggregate } from "../domain/pack/heroAggregate";
import type { PackIndex } from "../domain/pack/PackIndex";
import { namingFor } from "../generation/viewmodel/LanguageNaming";
import type { SyntaxChecker, SyntaxIssue } from "../ports/SyntaxChecker";
import { sourceFileOf } from "./codeView";
import { generateCode } from "./generateCode";
import type { TemplatesByLanguage } from "./loadTemplates";

/** A piece of generated code with a hole the learner fills in. */
export interface CodeExercise {
  readonly kind: ExerciseKind;
  readonly language: ProgrammingLanguageId;
  readonly path: string;
  readonly aggregate: string;
  readonly rule: string;
  /** The code before the hole, and after it, each ending where the hole begins or begins after it. */
  readonly before: string;
  readonly after: string;
  /** What the generator wrote in the hole. */
  readonly reference: string;
  /** What a plausible answer mentions: the error code of the rule and the data it reads. */
  readonly required: readonly string[];
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
  const words = text.match(/[a-z_][A-Za-z0-9_]*/g) ?? [];
  return [...new Set(words.filter((word) => !GENERIC_WORDS.has(word.toLowerCase())))];
}

interface Source {
  readonly index: PackIndex;
  readonly aggregate: string;
  readonly rule: string;
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
      : { index, aggregate: aggregate.codeName, rule };
  }
  if (kind === "implementTheChange" && evolved !== undefined) {
    for (const operation of index.pack.changeScenarios.evolution.patch) {
      if (operation.op === "addRule") {
        return { index: evolved, aggregate: operation.aggregate, rule: operation.rule.codeName };
      }
    }
  }
  return undefined;
}

/** The exercise of a kind that is written in code: the aggregate's code with one rule's check taken out. */
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
  const file = sourceFileOf(generated.value, { kind: "aggregate", aggregate: source.aggregate });
  const anchor = file?.anchors.find(
    (candidate) =>
      candidate.ref === `${source.aggregate}.rule.${source.rule}` ||
      candidate.ref === `${source.aggregate}.invariant.${source.rule}`,
  );
  if (file === undefined || anchor === undefined) return undefined;

  const lines = file.content.replace(/\n$/, "").split("\n");
  const hole = lines.slice(anchor.startLine - 1, anchor.endLine);
  const indentation = /^\s*/.exec(hole[0] ?? "")?.[0] ?? "";
  const reference = hole.join("\n");
  return {
    kind,
    language,
    path: file.path,
    aggregate: source.aggregate,
    rule: source.rule,
    before: `${lines.slice(0, anchor.startLine - 1).join("\n")}\n`,
    after: `${lines.slice(anchor.endLine).join("\n")}\n`,
    reference,
    required: [namingFor(language).errorCode(source.rule), ...identifiersIn(reference)],
    placeholder: `${indentation}${COMMENT_MARKER[language]} ${TODO_MARKER}: write the check here`,
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
  const missing = exercise.required.filter((token) => !answer.includes(token));
  return {
    issues,
    missing,
    unfinished,
    plausible: !unfinished && issues.length === 0 && missing.length === 0,
  };
}

export type { SyntaxChecker, SyntaxIssue };
