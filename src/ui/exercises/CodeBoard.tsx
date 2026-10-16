import { useMemo, useState, type ReactNode } from "react";
import {
  answerStartLine,
  checkCodeAnswer,
  deriveCodeExercise,
  type CodeExercise,
  type CodeVerdict,
} from "../../application/codeExercise";
import type { CourseSession } from "../../application/CourseSession";
import type { ExerciseKind } from "../../domain/course/Syllabus";
import type { ProgrammingLanguageId } from "../../domain/language/ProgrammingLanguage";
import "../code/code.css";
import { tokenizeLine } from "../code/highlight";
import { useI18n } from "../i18n/I18n";
import { useSyntaxChecker } from "./SyntaxCheckerContext";

interface CodeBoardProps {
  readonly session: CourseSession;
  readonly kind: ExerciseKind;
  readonly language: ProgrammingLanguageId;
  readonly onSolve: () => void;
}

const CONTEXT_LINES = 6;

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
      ruleLabel={ruleLabelOf(session, exercise, locale)}
      checker={checker}
      onSolve={onSolve}
    />
  );
}

function ruleLabelOf(
  session: CourseSession,
  exercise: CodeExercise,
  locale: "en" | "es-MX",
): string {
  const source =
    exercise.kind === "implementTheChange" ? (session.evolved ?? session.index) : session.index;
  return (
    source.aggregates.get(exercise.aggregate)?.rules.find((rule) => rule.codeName === exercise.rule)
      ?.label[locale] ?? exercise.rule
  );
}

function Editor({
  exercise,
  ruleLabel,
  checker,
  onSolve,
}: {
  readonly exercise: CodeExercise;
  readonly ruleLabel: string;
  readonly checker: ReturnType<typeof useSyntaxChecker>;
  readonly onSolve: () => void;
}): ReactNode {
  const { t } = useI18n();
  const [answer, setAnswer] = useState(exercise.placeholder);
  const [verdict, setVerdict] = useState<CodeVerdict | null>(null);
  const [checking, setChecking] = useState(false);
  const [revealed, setRevealed] = useState(false);

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
    if (next.plausible) onSolve();
  };

  return (
    <div className="codeboard">
      <p className="codeboard__task">
        {t("ui.exercise.code.task", { rule: ruleLabel, file: exercise.path })}
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
          <li className="note">{t("ui.exercise.code.runsInDojo")}</li>
        </ul>
      )}
      {revealed && (
        <pre className="codeboard__reference">
          <code>{exercise.reference}</code>
        </pre>
      )}
    </div>
  );
}
