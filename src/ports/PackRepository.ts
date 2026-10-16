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

/** Where generated packs live, so a business is generated once and reused. */
export interface PackRepository {
  list(): Promise<Result<readonly StoredPack[], StorageError>>;
  save(stored: StoredPack): Promise<Result<void, StorageError>>;
  remove(key: string): Promise<Result<void, StorageError>>;
}
