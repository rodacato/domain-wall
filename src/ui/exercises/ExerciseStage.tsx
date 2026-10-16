import { useMemo, useState, type ReactNode } from "react";
import type { CourseSession } from "../../application/CourseSession";
import type { ExerciseKind } from "../../domain/course/Syllabus";
import {
  checkClassification,
  checkOrder,
  type ClassifyChallenge,
  type ExerciseText,
  type OrderChallenge,
  type Verdict,
} from "../../domain/exercises/Exercise";
import { deriveExercise } from "../../domain/exercises/deriveExercise";
import type { ExerciseStageState } from "../../domain/wall/ExerciseStage";
import type { ProgrammingLanguageId } from "../../domain/language/ProgrammingLanguage";
import { CodeBoard } from "./CodeBoard";
import { useI18n } from "../i18n/I18n";
import { StageOverlay } from "../wall/StageOverlay";
import "./exercises.css";

interface ExerciseStageProps {
  readonly session: CourseSession;
  readonly exercise: ExerciseStageState;
  readonly language: ProgrammingLanguageId;
  readonly solved: (kind: ExerciseKind) => boolean;
  readonly onSolve: (kind: ExerciseKind) => void;
}

export function ExerciseStage({
  session,
  exercise,
  language,
  solved,
  onSolve,
}: ExerciseStageProps): ReactNode {
  if (exercise.kind === null) return null;
  return (
    <Board
      key={exercise.kind}
      session={session}
      kind={exercise.kind}
      language={language}
      alreadySolved={solved(exercise.kind)}
      onSolve={onSolve}
    />
  );
}

interface BoardProps {
  readonly session: CourseSession;
  readonly kind: ExerciseKind;
  readonly language: ProgrammingLanguageId;
  readonly alreadySolved: boolean;
  readonly onSolve: (kind: ExerciseKind) => void;
}

function Board({ session, kind, language, alreadySolved, onSolve }: BoardProps): ReactNode {
  const { t, has } = useI18n();
  const exercise = useMemo(() => deriveExercise(session.index, kind), [session.index, kind]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  const report = (next: Verdict): void => {
    setVerdict(next);
    if (next.correct) onSolve(kind);
  };

  return (
    <StageOverlay>
      <header className="exercise__header">
        <h2 className="exercise__title">{t(`ui.exercise.title.${kind}`)}</h2>
        {(alreadySolved || verdict?.correct === true) && (
          <span className="exercise__badge">{t("ui.exercise.solved")}</span>
        )}
      </header>
      {has(`ui.exercise.instructions.${kind}`) && (
        <p className="exercise__instructions">{t(`ui.exercise.instructions.${kind}`)}</p>
      )}
      {exercise === undefined ? (
        <CodeBoard
          session={session}
          kind={kind}
          language={language}
          onSolve={() => {
            setVerdict({ correct: true, wrong: [] });
            onSolve(kind);
          }}
        />
      ) : exercise.challenge.type === "classify" ? (
        <Classify
          challenge={exercise.challenge}
          verdict={verdict}
          onCheck={report}
          onEdit={() => {
            setVerdict(null);
          }}
        />
      ) : (
        <Ordering
          challenge={exercise.challenge}
          verdict={verdict}
          onCheck={report}
          onEdit={() => {
            setVerdict(null);
          }}
        />
      )}
      {verdict !== null && (
        <p className={`exercise__verdict ${verdict.correct ? "exercise__verdict--good" : ""}`}>
          {verdict.correct
            ? t("ui.exercise.correct")
            : t("ui.exercise.incorrect", { count: verdict.wrong.length })}
        </p>
      )}
    </StageOverlay>
  );
}

interface ChallengeProps<Kind> {
  readonly challenge: Kind;
  readonly verdict: Verdict | null;
  readonly onCheck: (verdict: Verdict) => void;
  readonly onEdit: () => void;
}

function useText(): (text: ExerciseText) => string {
  const { locale, t } = useI18n();
  return (text) => (text.kind === "pack" ? text.text[locale] : t(text.key));
}

function Classify({
  challenge,
  verdict,
  onCheck,
  onEdit,
}: ChallengeProps<ClassifyChallenge>): ReactNode {
  const { t } = useI18n();
  const text = useText();
  const [assignment, setAssignment] = useState<Readonly<Record<string, string>>>({});
  const complete = challenge.items.every((item) => assignment[item.id] !== undefined);

  return (
    <div className="exercise__body">
      <ul className="classify">
        {challenge.items.map((item) => {
          const isWrong = verdict?.wrong.includes(item.id) === true;
          const isRight = verdict !== null && !verdict.wrong.includes(item.id);
          return (
            <li
              key={item.id}
              className={`classify__row ${isWrong ? "classify__row--wrong" : ""} ${isRight ? "classify__row--right" : ""}`}
            >
              <span className="classify__item">{text(item.label)}</span>
              <span className="classify__groups" role="group" aria-label={text(item.label)}>
                {challenge.groups.map((group) => (
                  <button
                    key={group.id}
                    className="classify__group"
                    aria-pressed={assignment[item.id] === group.id}
                    onClick={() => {
                      setAssignment((current) => ({ ...current, [item.id]: group.id }));
                      onEdit();
                    }}
                  >
                    {text(group.label)}
                  </button>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
      <button
        className="exercise__check"
        disabled={!complete}
        onClick={() => {
          onCheck(checkClassification(challenge, assignment));
        }}
      >
        {t("ui.exercise.check")}
      </button>
    </div>
  );
}

function Ordering({
  challenge,
  verdict,
  onCheck,
  onEdit,
}: ChallengeProps<OrderChallenge>): ReactNode {
  const { t } = useI18n();
  const text = useText();
  const [order, setOrder] = useState(() => challenge.items.map((item) => item.id));
  const byId = new Map(challenge.items.map((item) => [item.id, item]));

  const move = (position: number, offset: number): void => {
    const target = position + offset;
    const moved = order[position];
    const displaced = order[target];
    if (moved === undefined || displaced === undefined) return;
    const next = [...order];
    next[position] = displaced;
    next[target] = moved;
    setOrder(next);
    onEdit();
  };

  return (
    <div className="exercise__body">
      <ol className="ordering">
        {order.map((id, position) => {
          const item = byId.get(id);
          const isWrong = verdict !== null && challenge.solution[position] !== id;
          const isRight = verdict !== null && challenge.solution[position] === id;
          return (
            <li
              key={id}
              className={`ordering__row ${isWrong ? "classify__row--wrong" : ""} ${isRight ? "classify__row--right" : ""}`}
            >
              <span className="ordering__number">{position + 1}</span>
              <span className="mini mini--event">{item === undefined ? id : text(item.label)}</span>
              <span className="ordering__moves">
                <button
                  disabled={position === 0}
                  aria-label={t("ui.exercise.up")}
                  onClick={() => {
                    move(position, -1);
                  }}
                >
                  ↑
                </button>
                <button
                  disabled={position === order.length - 1}
                  aria-label={t("ui.exercise.down")}
                  onClick={() => {
                    move(position, 1);
                  }}
                >
                  ↓
                </button>
              </span>
            </li>
          );
        })}
      </ol>
      <button
        className="exercise__check"
        onClick={() => {
          onCheck(checkOrder(challenge, order));
        }}
      >
        {t("ui.exercise.check")}
      </button>
    </div>
  );
}
