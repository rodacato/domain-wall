import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { startCourse } from "./application/CourseSession";
import { loadCatalogs } from "./application/loadCatalogs";
import syllabusJson from "./content/syllabus.json";
import { parseSyllabus } from "./domain/course/Syllabus";
import { negotiateLocale } from "./domain/locale/LocaleRegistry";
import { assemblePackParts } from "./domain/pack/assemblePackParts";
import { parseDomainPack } from "./domain/pack/parseDomainPack";
import { validateSemantics } from "./domain/pack/validation/validateSemantics";
import type { ValidationIssue } from "./domain/shared/ValidationIssue";
import { I18nProvider } from "./ui/i18n/I18n";
import { AppShell } from "./ui/shell/AppShell";
import "./ui/theme/theme.css";

const packParts = import.meta.glob("../packs/hecho-a-mano/*.json", {
  eager: true,
  import: "default",
});
const catalogFiles = import.meta.glob("./content/locales/*/*.json", {
  eager: true,
  import: "default",
});

function startupIssues(): readonly ValidationIssue[] | null {
  const assembled = assemblePackParts(packParts);
  if (!assembled.ok) return assembled.error;
  const parsed = parseDomainPack(assembled.value);
  if (!parsed.ok) return parsed.error;
  const validated = validateSemantics(parsed.value);
  if (!validated.ok) return validated.error;
  const syllabus = parseSyllabus(syllabusJson);
  if (!syllabus.ok) return syllabus.error;

  const catalogs = loadCatalogs(catalogFiles);
  const session = startCourse({ pack: validated.value, syllabus: syllabus.value, catalogs });
  const container = document.getElementById("root");
  if (container === null) throw new Error("the page has no #root element");
  createRoot(container).render(
    <StrictMode>
      <I18nProvider catalogs={catalogs} initialLocale={negotiateLocale(navigator.languages)}>
        <AppShell session={session} />
      </I18nProvider>
    </StrictMode>,
  );
  return null;
}

const issues = startupIssues();
if (issues !== null) {
  const container = document.getElementById("root");
  if (container !== null) {
    container.textContent = issues
      .map((issue) => `[${issue.ruleId}] ${issue.path}: ${issue.message}`)
      .join("\n");
    container.style.whiteSpace = "pre-wrap";
    container.style.padding = "24px";
  }
}
