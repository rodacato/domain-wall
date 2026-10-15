import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  IndexedDbPreferencesRepository,
  IndexedDbProgressRepository,
  openLearnerDatabase,
} from "./adapters/storage/IndexedDbLearnerStorage";
import {
  InMemoryPreferencesRepository,
  InMemoryProgressRepository,
} from "./adapters/storage/InMemoryLearnerStorage";
import { startCourse, type CourseSession } from "./application/CourseSession";
import { loadCatalogs } from "./application/loadCatalogs";
import { loadLearnerState, type LearnerStorage } from "./application/learnerState";
import syllabusJson from "./content/syllabus.json";
import { QUANTITY_SAMPLES } from "./content/onboarding/quantitySamples";
import { parseSyllabus } from "./domain/course/Syllabus";
import { assemblePackParts } from "./domain/pack/assemblePackParts";
import { parseDomainPack } from "./domain/pack/parseDomainPack";
import { validateSemantics } from "./domain/pack/validation/validateSemantics";
import { ok, type Result } from "./domain/shared/Result";
import type { ValidationIssue } from "./domain/shared/ValidationIssue";
import { CourseApp } from "./ui/shell/CourseApp";
import "./ui/theme/theme.css";

const packParts = import.meta.glob("../packs/hecho-a-mano/*.json", {
  eager: true,
  import: "default",
});
const catalogFiles = import.meta.glob("./content/locales/*/*.json", {
  eager: true,
  import: "default",
});

async function openStorage(): Promise<LearnerStorage> {
  const database = await openLearnerDatabase();
  if (!database.ok) {
    return {
      progress: new InMemoryProgressRepository(),
      preferences: new InMemoryPreferencesRepository(),
    };
  }
  return {
    progress: new IndexedDbProgressRepository(database.value),
    preferences: new IndexedDbPreferencesRepository(database.value),
  };
}

function showIssues(issues: readonly ValidationIssue[]): void {
  const container = document.getElementById("root");
  if (container === null) return;
  container.textContent = issues
    .map((issue) => `[${issue.ruleId}] ${issue.path}: ${issue.message}`)
    .join("\n");
  container.style.whiteSpace = "pre-wrap";
  container.style.padding = "24px";
}

function buildSession(): Result<CourseSession, readonly ValidationIssue[]> {
  const assembled = assemblePackParts(packParts);
  if (!assembled.ok) return assembled;
  const parsed = parseDomainPack(assembled.value);
  if (!parsed.ok) return parsed;
  const validated = validateSemantics(parsed.value);
  if (!validated.ok) return validated;
  const syllabus = parseSyllabus(syllabusJson);
  if (!syllabus.ok) return syllabus;

  return ok(
    startCourse({
      pack: validated.value,
      syllabus: syllabus.value,
      catalogs: loadCatalogs(catalogFiles),
      languageSamples: QUANTITY_SAMPLES,
    }),
  );
}

async function start(): Promise<void> {
  const built = buildSession();
  if (!built.ok) {
    showIssues(built.error);
    return;
  }
  const session = built.value;
  const storage = await openStorage();
  const initial = await loadLearnerState(storage, navigator.languages);

  const container = document.getElementById("root");
  if (container === null) throw new Error("the page has no #root element");
  createRoot(container).render(
    <StrictMode>
      <CourseApp session={session} storage={storage} initial={initial} />
    </StrictMode>,
  );
}

void start();
