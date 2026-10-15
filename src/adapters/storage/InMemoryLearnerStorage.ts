import type { LearnerPreferences } from "../../domain/progress/LearnerPreferences";
import type { Progress } from "../../domain/progress/Progress";
import { ok } from "../../domain/shared/Result";
import type { PreferencesRepository, ProgressRepository } from "../../ports/LearnerStorage";

/** Keeps the learner's state for the life of the page. Used in tests and when IndexedDB is unavailable. */
export class InMemoryProgressRepository implements ProgressRepository {
  private stored: Progress | null = null;

  load(): ReturnType<ProgressRepository["load"]> {
    return Promise.resolve(ok(this.stored));
  }

  save(progress: Progress): ReturnType<ProgressRepository["save"]> {
    this.stored = progress;
    return Promise.resolve(ok(undefined));
  }
}

export class InMemoryPreferencesRepository implements PreferencesRepository {
  private stored: LearnerPreferences | null = null;

  load(): ReturnType<PreferencesRepository["load"]> {
    return Promise.resolve(ok(this.stored));
  }

  save(preferences: LearnerPreferences): ReturnType<PreferencesRepository["save"]> {
    this.stored = preferences;
    return Promise.resolve(ok(undefined));
  }
}
