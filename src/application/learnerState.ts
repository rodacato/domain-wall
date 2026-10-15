import type { ConceptId } from "../domain/course/ConceptId";
import type { Syllabus } from "../domain/course/Syllabus";
import { negotiateLocale } from "../domain/locale/LocaleRegistry";
import {
  DEFAULT_PREFERENCES,
  type LearnerPreferences,
} from "../domain/progress/LearnerPreferences";
import {
  completeConcept,
  EMPTY_PROGRESS,
  type CompletionRecord,
  type Progress,
} from "../domain/progress/Progress";
import type {
  StorageError,
  PreferencesRepository,
  ProgressRepository,
} from "../ports/LearnerStorage";

/** What the course knows about the learner when it starts. */
export interface LearnerState {
  readonly progress: Progress;
  readonly preferences: LearnerPreferences;
  /** False the first time: the course starts with onboarding instead of the wall. */
  readonly onboarded: boolean;
  /** Storage problems the learner may want to know about; the course keeps working without storage. */
  readonly storageProblems: readonly StorageError[];
}

export interface LearnerStorage {
  readonly progress: ProgressRepository;
  readonly preferences: PreferencesRepository;
}

/** Use case: read what was saved, falling back to defaults when nothing usable is stored. */
export async function loadLearnerState(
  storage: LearnerStorage,
  preferredLanguageTags: readonly string[],
): Promise<LearnerState> {
  const [progress, preferences] = await Promise.all([
    storage.progress.load(),
    storage.preferences.load(),
  ]);
  const storageProblems: StorageError[] = [];
  if (!progress.ok) storageProblems.push(progress.error);
  if (!preferences.ok) storageProblems.push(preferences.error);

  const savedPreferences = preferences.ok ? preferences.value : null;
  const defaults: LearnerPreferences = {
    ...DEFAULT_PREFERENCES,
    locale: negotiateLocale(preferredLanguageTags),
  };
  return {
    progress: (progress.ok ? progress.value : null) ?? EMPTY_PROGRESS,
    preferences: savedPreferences ?? defaults,
    onboarded: savedPreferences !== null,
    storageProblems,
  };
}

/** Use case: save the learner's choices. Changing industry or language never touches progress. */
export async function savePreferences(
  storage: LearnerStorage,
  preferences: LearnerPreferences,
): Promise<readonly StorageError[]> {
  const saved = await storage.preferences.save(preferences);
  return saved.ok ? [] : [saved.error];
}

/** Use case: note that the learner reached a concept. Reaching it twice keeps the first record. */
export async function recordConceptReached(
  storage: LearnerStorage,
  syllabus: Syllabus,
  progress: Progress,
  conceptId: ConceptId,
  record: CompletionRecord,
): Promise<{ readonly progress: Progress; readonly storageProblems: readonly StorageError[] }> {
  const completed = completeConcept(progress, syllabus, conceptId, record);
  if (!completed.ok || completed.value === progress) return { progress, storageProblems: [] };
  const saved = await storage.progress.save(completed.value);
  return { progress: completed.value, storageProblems: saved.ok ? [] : [saved.error] };
}
