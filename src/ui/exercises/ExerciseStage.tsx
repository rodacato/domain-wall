import { useMemo, useState, type ReactNode } from "react";
import type { CourseSession } from "../../application/CourseSession";
import type { ExerciseKind } from "../../domain/course/Syllabus";
import {
  checkClassification,
  checkOrder,
  directionToPlace,
  type ClassifyChallenge,
  type ExerciseText,
  type OrderChallenge,
  type Verdict,
} from "../../domain/exercises/Exercise";
import { deriveExercise } from "../../domain/exercises/deriveExercise";
import type { ExerciseStageState } from "../../domain/wall/ExerciseStage";
import type { ProgrammingLanguageId } from "../../domain/language/ProgrammingLanguage";
import type { ExerciseEvidence } from "../../domain/progress/Progress";
import { CodeBoard } from "./CodeBoard";
import { useI18n } from "../i18n/I18n";
import { StageOverlay } from "../wall/StageOverlay";
import "./exercises.css";

interface ExerciseStageProps {
  readonly session: CourseSession;
  readonly exercise: ExerciseStageState;
  readonly language: ProgrammingLanguageId;
  readonly evidenceOf: (kind: ExerciseKind) => ExerciseEvidence | undefined;
  readonly onSolve: (kind: ExerciseKind, evidence: ExerciseEvidence) => void;
}

export function ExerciseStage({
  session,
  exercise,
  language,
  evidenceOf,
  onSolve,
}: ExerciseStageProps): ReactNode {
  if (exercise.kind === null) return null;
  return (
    <Board
      key={exercise.kind}
      session={session}
      kind={exercise.kind}
      language={language}
      evidence={evidenceOf(exercise.kind)}
      onSolve={onSolve}
    />
  );
}

interface BoardProps {
  readonly session: CourseSession;
  readonly kind: ExerciseKind;
  readonly language: ProgrammingLanguageId;
  readonly evidence: ExerciseEvidence | undefined;
  readonly onSolve: (kind: ExerciseKind, evidence: ExerciseEvidence) => void;
}

function Board({ session, kind, language, evidence, onSolve }: BoardProps): ReactNode {
  const { t, has } = useI18n();
  const exercise = useMemo(() => deriveExercise(session.index, kind), [session.index, kind]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  const report = (next: Verdict): void => {
    setVerdict(next);
    if (next.correct) onSolve(kind, "answered");
  };

  return (
    <StageOverlay>
      <header className="exercise__header">
        <h2 className="exercise__title">{t(`ui.exercise.title.${kind}`)}</h2>
        {evidence !== undefined && (
          <span className={`exercise__badge exercise__badge--${evidence}`}>
            {t(`ui.exercise.solved.${evidence}`)}
          </span>
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
          onSolve={(next) => {
            onSolve(kind, next);
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

/** What a checked row says in words, so the colour is never the only signal. */
function Feedback({
  right,
  hint,
  showHint,
}: {
  readonly right: boolean;
  readonly hint: string | null;
  readonly showHint: boolean;
}): ReactNode {
  const { t } = useI18n();
  return (
    <span className={`feedback ${right ? "feedback--right" : "feedback--wrong"}`}>
      <strong>
        {right ? `✓ ${t("ui.exercise.mark.right")}` : `✗ ${t("ui.exercise.mark.wrong")}`}
      </strong>
      {showHint && hint !== null && <span className="feedback__hint">{hint}</span>}
    </span>
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
          const reason = challenge.reasons[item.id];
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
              {verdict !== null && (
                <Feedback
                  right={!isWrong}
                  hint={reason === undefined ? null : text(reason)}
                  showHint={isWrong || verdict.correct}
                />
              )}
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
              {verdict !== null && (
                <Feedback
                  right={isRight}
                  hint={(() => {
                    const direction = directionToPlace(challenge, order, id);
                    return direction === null ? null : t(`ui.exercise.move.${direction}`);
                  })()}
                  showHint={isWrong}
                />
              )}
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
