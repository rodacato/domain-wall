import type { Result } from "../domain/shared/Result";
import type { LearnerPreferences } from "../domain/progress/LearnerPreferences";
import type { Progress } from "../domain/progress/Progress";

/** Why stored data could not be read or written. */
export type StorageError =
  | { readonly kind: "unavailable"; readonly message: string }
  | { readonly kind: "corrupt"; readonly message: string };

/** Where the learner's progress lives. A missing record is an empty `null`, not an error. */
export interface ProgressRepository {
  load(): Promise<Result<Progress | null, StorageError>>;
  save(progress: Progress): Promise<Result<void, StorageError>>;
}

export interface PreferencesRepository {
  load(): Promise<Result<LearnerPreferences | null, StorageError>>;
  save(preferences: LearnerPreferences): Promise<Result<void, StorageError>>;
}
