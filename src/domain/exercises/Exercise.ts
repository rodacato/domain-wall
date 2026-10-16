import type { ExerciseKind } from "../course/Syllabus";
import type { LocalizedText } from "../locale/LocalizedText";

/** Text an exercise shows: taken from the pack, or from the course's own catalog. */
export type ExerciseText =
  | { readonly kind: "pack"; readonly text: LocalizedText }
  | { readonly kind: "ui"; readonly key: string };

export interface ExerciseItem {
  readonly id: string;
  readonly label: ExerciseText;
}

/** Put every item in the group it belongs to. */
export interface ClassifyChallenge {
  readonly type: "classify";
  readonly items: readonly ExerciseItem[];
  readonly groups: readonly ExerciseItem[];
  /** The group of each item, by id. */
  readonly solution: Readonly<Record<string, string>>;
}

/** Put the items in the order they happen. */
export interface OrderChallenge {
  readonly type: "order";
  /** The items as the learner first sees them, shuffled. */
  readonly items: readonly ExerciseItem[];
  readonly solution: readonly string[];
}

export type Challenge = ClassifyChallenge | OrderChallenge;

export interface Exercise {
  readonly kind: ExerciseKind;
  readonly challenge: Challenge;
}

export interface Verdict {
  readonly correct: boolean;
  /** Ids of the items that are not where they belong. */
  readonly wrong: readonly string[];
}

export function checkClassification(
  challenge: ClassifyChallenge,
  assignment: Readonly<Record<string, string>>,
): Verdict {
  const wrong = challenge.items
    .filter((item) => assignment[item.id] !== challenge.solution[item.id])
    .map((item) => item.id);
  return { correct: wrong.length === 0, wrong };
}

export function checkOrder(challenge: OrderChallenge, order: readonly string[]): Verdict {
  const wrong = challenge.solution.filter((id, position) => order[position] !== id);
  return { correct: wrong.length === 0, wrong };
}
