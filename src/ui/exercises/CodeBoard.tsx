import { useMemo, useState, type ReactNode } from "react";
import {
  answerStartLine,
  checkCodeAnswer,
  deriveCodeExercise,
  exerciseRunRequest,
  type CodeExercise,
  type CodeVerdict,
} from "../../application/codeExercise";
import type { CourseSession } from "../../application/CourseSession";
import type { ExerciseKind } from "../../domain/course/Syllabus";
import type { LocaleCode } from "../../domain/locale/LocaleRegistry";
import { labelOfAnchor } from "../../domain/pack/anchorRef";
import type { ProgrammingLanguageId } from "../../domain/language/ProgrammingLanguage";
import "../code/code.css";
import { tokenizeLine } from "../code/highlight";
import { useI18n } from "../i18n/I18n";
import { allPassed, type RunOutcome } from "../../domain/execution/RunOutcome";
import { useRunner } from "./RunnerContext";
import { useSyntaxChecker } from "./SyntaxCheckerContext";

interface CodeBoardProps {
  readonly session: CourseSession;
  readonly kind: ExerciseKind;
  readonly language: ProgrammingLanguageId;
  readonly onSolve: (evidence: "reviewed" | "tested") => void;
}

const CONTEXT_LINES = 6;
const RUN_TIMEOUT_MILLISECONDS = 20_000;

function Lines({
  text,
  language,
  from,
}: {
  text: string;
  language: ProgrammingLanguageId;
  from: number;
}): ReactNode {
  return (
    <div className="codeboard__context">
      {text
        .replace(/\n$/, "")
        .split("\n")
        .map((line, position) => (
          <div key={position} className="code__line">
            <span className="code__number">{from + position}</span>
            <span className="code__text">
              {tokenizeLine(line, language).map((token, tokenPosition) => (
                <span key={tokenPosition} className={`tok tok--${token.kind}`}>
                  {token.text}
                </span>
              ))}
            </span>
          </div>
        ))}
    </div>
  );
}

/** An exercise written in code: the aggregate with one rule's check missing, and a box to write it in. */
export function CodeBoard({ session, kind, language, onSolve }: CodeBoardProps): ReactNode {
  const { locale, t } = useI18n();
  const checker = useSyntaxChecker();
  const exercise = useMemo(
    () => deriveCodeExercise(kind, session.index, session.evolved, language, session.templates),
    [session, kind, language],
  );
  if (exercise === undefined) return <p className="exercise__soon">{t("ui.exercise.codeSoon")}</p>;
  return (
    <Editor
      key={`${kind}-${language}`}
      exercise={exercise}
      subject={subjectLabelOf(session, exercise, locale)}
      checker={checker}
      onSolve={onSolve}
    />
  );
}

function subjectLabelOf(
  session: CourseSession,
  exercise: CodeExercise,
  locale: LocaleCode,
): string {
  const source = exercise.forEvolvedModel ? (session.evolved ?? session.index) : session.index;
  return labelOfAnchor(source, exercise.anchorRef)?.[locale] ?? exercise.anchorRef;
}

function Editor({
  exercise,
  subject,
  checker,
  onSolve,
}: {
  readonly exercise: CodeExercise;
  readonly subject: string;
  readonly checker: ReturnType<typeof useSyntaxChecker>;
  readonly onSolve: CodeBoardProps["onSolve"];
}): ReactNode {
  const { t } = useI18n();
  const [answer, setAnswer] = useState(exercise.placeholder);
  const [verdict, setVerdict] = useState<CodeVerdict | null>(null);
  const [checking, setChecking] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const runner = useRunner();
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<RunOutcome | "failed" | null>(null);

  const before = exercise.before.replace(/\n$/, "").split("\n");
  const shownBefore = before.slice(-CONTEXT_LINES);
  const after = exercise.after.replace(/\n$/, "").split("\n").slice(0, CONTEXT_LINES);
  const firstShown = before.length - shownBefore.length + 1;
  const start = answerStartLine(exercise);

  const check = async (): Promise<void> => {
    setChecking(true);
    const next = await checkCodeAnswer(exercise, answer, checker);
    setChecking(false);
    setVerdict(next);
    if (next.plausible) onSolve("reviewed");
  };

  const runTests = async (): Promise<void> => {
    if (runner === null) return;
    setRunning(true);
    const result = await runner.run(exerciseRunRequest(exercise, answer, RUN_TIMEOUT_MILLISECONDS));
    setRunning(false);
    setOutcome(result.ok ? result.value : "failed");
    if (result.ok && allPassed(result.value)) onSolve("tested");
  };

  return (
    <div className="codeboard">
      <p className="codeboard__task">
        {t(`ui.exercise.code.task.${exercise.kind}`, { subject, file: exercise.path })}
      </p>
      <div className="code codeboard__editor">
        <Lines text={shownBefore.join("\n")} language={exercise.language} from={firstShown} />
        <textarea
          className="codeboard__answer"
          value={answer}
          spellCheck={false}
          rows={Math.max(3, exercise.reference.split("\n").length + 1)}
          aria-label={t("ui.exercise.code.answer")}
          onChange={(event) => {
            setAnswer(event.target.value);
            setVerdict(null);
          }}
        />
        <Lines
          text={after.join("\n")}
          language={exercise.language}
          from={start + answer.split("\n").length}
        />
      </div>

      <div className="codeboard__actions">
        <button className="exercise__check" disabled={checking} onClick={() => void check()}>
          {t("ui.exercise.check")}
        </button>
        {runner !== null && (
          <button
            className="exercise__check"
            disabled={running || answer.includes("TODO")}
            onClick={() => void runTests()}
          >
            {t("ui.exercise.code.run")}
          </button>
        )}
        <button
          className="codeboard__reveal"
          onClick={() => {
            setRevealed(true);
          }}
        >
          {t("ui.exercise.code.reveal")}
        </button>
      </div>

      {verdict !== null && (
        <ul className="codeboard__verdict">
          <li className={verdict.unfinished ? "bad" : "good"}>
            {verdict.unfinished ? t("ui.exercise.code.unfinished") : t("ui.exercise.code.written")}
          </li>
          <li className={verdict.issues.length === 0 ? "good" : "bad"}>
            {verdict.issues.length === 0
              ? t("ui.exercise.code.syntaxValid")
              : verdict.issues
                  .slice(0, 3)
                  .map((issue) =>
                    t("ui.exercise.code.syntaxIssue", {
                      line: Math.max(1, issue.line - start + 1),
                      snippet: issue.snippet,
                    }),
                  )
                  .join(" · ")}
          </li>
          <li className={verdict.missing.length === 0 ? "good" : "bad"}>
            {verdict.missing.length === 0
              ? t("ui.exercise.code.mentions")
              : t("ui.exercise.code.missing", { tokens: verdict.missing.join(", ") })}
          </li>
          <li className="note">
            {runner === null ? t("ui.exercise.code.runsInDojo") : t("ui.exercise.code.runsHere")}
          </li>
        </ul>
      )}
      {outcome !== null && <TestReport outcome={outcome} />}
      {revealed && (
        <pre className="codeboard__reference">
          <code>{exercise.reference}</code>
        </pre>
      )}
    </div>
  );
}

function TestReport({ outcome }: { readonly outcome: RunOutcome | "failed" }): ReactNode {
  const { t } = useI18n();
  if (outcome === "failed")
    return <p className="codeboard__outcome bad">{t("ui.exercise.code.runFailed")}</p>;
  if (outcome.kind === "syntaxChecked") {
    return <p className="codeboard__outcome">{t("ui.exercise.code.notExecuted")}</p>;
  }
  const failing = outcome.tests.filter((test) => test.status === "failed");
  return (
    <div className="codeboard__outcome">
      <p className={failing.length === 0 ? "good" : "bad"}>
        {t("ui.exercise.code.testsSummary", {
          passed: outcome.tests.length - failing.length,
          total: outcome.tests.length,
        })}
      </p>
      <ul>
        {failing.slice(0, 5).map((test) => (
          <li key={test.name}>
            <strong>{test.name}</strong> {test.message ?? ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
