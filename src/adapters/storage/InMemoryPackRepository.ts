import { ok, type Result } from "../../domain/shared/Result";
import type { StorageError } from "../../ports/LearnerStorage";
import type { PackRepository, StoredPack } from "../../ports/PackRepository";

/** Keeps generated packs for the life of the page, for when IndexedDB cannot be used. */
export class InMemoryPackRepository implements PackRepository {
  private readonly packs = new Map<string, StoredPack>();

  list(): Promise<Result<readonly StoredPack[], StorageError>> {
    return Promise.resolve(ok([...this.packs.values()]));
  }

  save(stored: StoredPack): Promise<Result<void, StorageError>> {
    this.packs.set(stored.key, stored);
    return Promise.resolve(ok(undefined));
  }

  remove(key: string): Promise<Result<void, StorageError>> {
    this.packs.delete(key);
    return Promise.resolve(ok(undefined));
  }
}
