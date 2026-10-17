import { openDB, type IDBPDatabase } from "idb";
import { z, type ZodType } from "zod";
import {
  learnerPreferencesSchema,
  type LearnerPreferences,
} from "../../domain/progress/LearnerPreferences";
import { progressSchema, type Progress } from "../../domain/progress/Progress";
import { err, ok, type Result } from "../../domain/shared/Result";
import type {
  PreferencesRepository,
  ProgressRepository,
  StorageError,
} from "../../ports/LearnerStorage";
import type { PackRepository, StoredDraft, StoredPack } from "../../ports/PackRepository";

const DATABASE_NAME = "domain-wall";
const DATABASE_VERSION = 3;
const STORE = "learner";
const PACK_STORE = "packs";
const DRAFT_STORE = "drafts";

type LearnerDatabase = IDBPDatabase;

/** Opens the database, or explains why it cannot be used (private windows and blocked site data are common). */
export async function openLearnerDatabase(): Promise<Result<LearnerDatabase, StorageError>> {
  try {
    const database = await openDB(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(upgrading) {
        if (!upgrading.objectStoreNames.contains(STORE)) upgrading.createObjectStore(STORE);
        if (!upgrading.objectStoreNames.contains(PACK_STORE)) {
          upgrading.createObjectStore(PACK_STORE, { keyPath: "key" });
        }
        if (!upgrading.objectStoreNames.contains(DRAFT_STORE)) {
          upgrading.createObjectStore(DRAFT_STORE, { keyPath: "key" });
        }
      },
    });
    return ok(database);
  } catch (failure) {
    return err({
      kind: "unavailable",
      message: failure instanceof Error ? failure.message : "IndexedDB is not available",
    });
  }
}

async function readRecord<Value>(
  database: LearnerDatabase,
  key: string,
  schema: ZodType<Value>,
): Promise<Result<Value | null, StorageError>> {
  try {
    const raw: unknown = await database.get(STORE, key);
    if (raw === undefined) return ok(null);
    const parsed = schema.safeParse(raw);
    return parsed.success
      ? ok(parsed.data)
      : err({ kind: "corrupt", message: `stored "${key}" does not match its schema` });
  } catch (failure) {
    return err({
      kind: "unavailable",
      message: failure instanceof Error ? failure.message : "read failed",
    });
  }
}

async function writeRecord(
  database: LearnerDatabase,
  key: string,
  value: unknown,
): Promise<Result<void, StorageError>> {
  try {
    await database.put(STORE, value, key);
    return ok(undefined);
  } catch (failure) {
    return err({
      kind: "unavailable",
      message: failure instanceof Error ? failure.message : "write failed",
    });
  }
}

export class IndexedDbProgressRepository implements ProgressRepository {
  constructor(private readonly database: LearnerDatabase) {}

  load(): Promise<Result<Progress | null, StorageError>> {
    return readRecord(this.database, "progress", progressSchema);
  }

  save(progress: Progress): Promise<Result<void, StorageError>> {
    return writeRecord(this.database, "progress", progress);
  }
}

export class IndexedDbPreferencesRepository implements PreferencesRepository {
  constructor(private readonly database: LearnerDatabase) {}

  load(): Promise<Result<LearnerPreferences | null, StorageError>> {
    return readRecord(this.database, "preferences", learnerPreferencesSchema);
  }

  save(preferences: LearnerPreferences): Promise<Result<void, StorageError>> {
    return writeRecord(this.database, "preferences", preferences);
  }
}

const storedPackSchema = z.object({
  key: z.string(),
  createdAt: z.string(),
  description: z.string(),
  pack: z.unknown(),
});

const storedDraftSchema = z.object({
  key: z.string(),
  updatedAt: z.string(),
  draft: z.unknown(),
});

function unavailable(failure: unknown, fallback: string): Result<never, StorageError> {
  return err({
    kind: "unavailable",
    message: failure instanceof Error ? failure.message : fallback,
  });
}

export class IndexedDbPackRepository implements PackRepository {
  readonly durable = true;

  constructor(private readonly database: LearnerDatabase) {}

  async list(): Promise<Result<readonly StoredPack[], StorageError>> {
    try {
      const raw: unknown[] = await this.database.getAll(PACK_STORE);
      return ok(
        raw.flatMap((entry) => {
          const parsed = storedPackSchema.safeParse(entry);
          return parsed.success ? [parsed.data] : [];
        }),
      );
    } catch (failure) {
      return err({
        kind: "unavailable",
        message: failure instanceof Error ? failure.message : "read failed",
      });
    }
  }

  async save(stored: StoredPack): Promise<Result<void, StorageError>> {
    try {
      await this.database.put(PACK_STORE, stored);
      return ok(undefined);
    } catch (failure) {
      return err({
        kind: "unavailable",
        message: failure instanceof Error ? failure.message : "write failed",
      });
    }
  }

  async remove(key: string): Promise<Result<void, StorageError>> {
    try {
      await this.database.delete(PACK_STORE, key);
      return ok(undefined);
    } catch (failure) {
      return err({
        kind: "unavailable",
        message: failure instanceof Error ? failure.message : "delete failed",
      });
    }
  }

  async loadDraft(key: string): Promise<Result<StoredDraft | null, StorageError>> {
    try {
      const raw: unknown = await this.database.get(DRAFT_STORE, key);
      const parsed = storedDraftSchema.safeParse(raw);
      return ok(parsed.success ? parsed.data : null);
    } catch (failure) {
      return unavailable(failure, "read failed");
    }
  }

  async saveDraft(stored: StoredDraft): Promise<Result<void, StorageError>> {
    try {
      await this.database.put(DRAFT_STORE, stored);
      return ok(undefined);
    } catch (failure) {
      return unavailable(failure, "write failed");
    }
  }

  async removeDraft(key: string): Promise<Result<void, StorageError>> {
    try {
      await this.database.delete(DRAFT_STORE, key);
      return ok(undefined);
    } catch (failure) {
      return unavailable(failure, "delete failed");
    }
  }
}
