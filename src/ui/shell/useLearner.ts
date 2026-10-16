import { useCallback, useEffect, useRef, useState } from "react";
import {
  savePreferences,
  type LearnerState,
  type LearnerStorage,
} from "../../application/learnerState";
import { packIdOf } from "../../application/packLibrary";
import type { ConceptId } from "../../domain/course/ConceptId";
import type { ExerciseKind, Syllabus } from "../../domain/course/Syllabus";
import type { LearnerPreferences } from "../../domain/progress/LearnerPreferences";
import {
  completeConcept,
  completeExercise,
  type ExerciseEvidence,
  type Progress,
} from "../../domain/progress/Progress";

export interface Learner {
  readonly progress: Progress;
  readonly preferences: LearnerPreferences;
  readonly onboarded: boolean;
  readonly choose: (preferences: LearnerPreferences) => void;
  readonly reach: (conceptId: ConceptId) => void;
  readonly solve: (exercise: ExerciseKind, evidence: ExerciseEvidence) => void;
}

/** Holds the learner's progress and choices in the UI and writes every change through to storage. */
export function useLearner(
  storage: LearnerStorage,
  syllabus: Syllabus,
  initial: LearnerState,
): Learner {
  const [progress, setProgress] = useState(initial.progress);
  const [preferences, setPreferences] = useState(initial.preferences);
  const [onboarded, setOnboarded] = useState(initial.onboarded);
  const lastSaved = useRef(initial.progress);

  useEffect(() => {
    if (progress === lastSaved.current) return;
    lastSaved.current = progress;
    void storage.progress.save(progress);
  }, [progress, storage]);

  const choose = useCallback(
    (next: LearnerPreferences) => {
      setPreferences(next);
      setOnboarded(true);
      void savePreferences(storage, next);
    },
    [storage],
  );

  const reach = useCallback(
    (conceptId: ConceptId) => {
      setProgress((current) => {
        const completed = completeConcept(current, syllabus, conceptId, {
          completedAt: new Date().toISOString(),
          packId: packIdOf(preferences.pack),
          programmingLanguage: preferences.programmingLanguage,
          locale: preferences.locale,
        });
        return completed.ok ? completed.value : current;
      });
    },
    [syllabus, preferences.programmingLanguage, preferences.locale, preferences.pack],
  );

  const solve = useCallback(
    (exercise: ExerciseKind, evidence: ExerciseEvidence) => {
      setProgress((current) =>
        completeExercise(current, exercise, {
          completedAt: new Date().toISOString(),
          packId: packIdOf(preferences.pack),
          programmingLanguage: preferences.programmingLanguage,
          locale: preferences.locale,
          evidence,
        }),
      );
    },
    [preferences.pack, preferences.programmingLanguage, preferences.locale],
  );

  return { progress, preferences, onboarded, choose, reach, solve };
}
