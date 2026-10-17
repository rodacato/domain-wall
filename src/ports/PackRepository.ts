import type { Result } from "../domain/shared/Result";
import type { StorageError } from "./LearnerStorage";

/** A generated pack as it was stored. It is not trusted until it is validated again. */
export interface StoredPack {
  readonly key: string;
  readonly createdAt: string;
  /** What the learner asked for. */
  readonly description: string;
  readonly pack: unknown;
}

/** What an unfinished generation produced, kept so a failure does not throw away what was already paid for. */
export interface StoredDraft {
  readonly key: string;
  readonly updatedAt: string;
  readonly draft: unknown;
}

/** Where generated packs live, so a business is generated once and reused. */
export interface PackRepository {
  list(): Promise<Result<readonly StoredPack[], StorageError>>;
  save(stored: StoredPack): Promise<Result<void, StorageError>>;
  remove(key: string): Promise<Result<void, StorageError>>;
  loadDraft(key: string): Promise<Result<StoredDraft | null, StorageError>>;
  saveDraft(stored: StoredDraft): Promise<Result<void, StorageError>>;
  removeDraft(key: string): Promise<Result<void, StorageError>>;
  /** Whether what is kept outlives the page; false when the browser offers no storage. */
  readonly durable: boolean;
}
