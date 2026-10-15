import { openDB, type IDBPDatabase } from "idb";
import type { ZodType } from "zod";
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

const DATABASE_NAME = "domain-wall";
const DATABASE_VERSION = 1;
const STORE = "learner";

type LearnerDatabase = IDBPDatabase;

/** Opens the database, or explains why it cannot be used (private windows and blocked site data are common). */
export async function openLearnerDatabase(): Promise<Result<LearnerDatabase, StorageError>> {
  try {
    const database = await openDB(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(upgrading) {
        upgrading.createObjectStore(STORE);
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
