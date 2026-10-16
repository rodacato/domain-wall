import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  IndexedDbPackRepository,
  IndexedDbPreferencesRepository,
  IndexedDbProgressRepository,
  openLearnerDatabase,
} from "./adapters/storage/IndexedDbLearnerStorage";
import { InMemoryPackRepository } from "./adapters/storage/InMemoryPackRepository";
import {
  InMemoryPreferencesRepository,
  InMemoryProgressRepository,
} from "./adapters/storage/InMemoryLearnerStorage";
import { AnthropicProvider } from "./adapters/llm/AnthropicProvider";
import { OpenAiCompatibleProvider } from "./adapters/llm/OpenAiCompatibleProvider";
import { SimulatedLlmProvider } from "./adapters/llm/SimulatedLlmProvider";
import { HostLlmProvider } from "./adapters/host/HostLlmProvider";
import { HostRunner } from "./adapters/host/HostRunner";
import { NoHostBridge } from "./adapters/host/NoHostBridge";
import { PostMessageHostBridge } from "./adapters/host/PostMessageHostBridge";
import { TreeSitterSyntaxChecker } from "./adapters/syntax/TreeSitterSyntaxChecker";
import pythonWasm from "tree-sitter-python/tree-sitter-python.wasm?url";
import rubyWasm from "tree-sitter-ruby/tree-sitter-ruby.wasm?url";
import typescriptWasm from "tree-sitter-typescript/tree-sitter-typescript.wasm?url";
import runtimeWasm from "web-tree-sitter/web-tree-sitter.wasm?url";
import type { CourseSharedInput } from "./application/CourseSession";
import type { HostBridge } from "./application/host";
import { loadCatalogs } from "./application/loadCatalogs";
import { loadTemplates } from "./application/loadTemplates";
import type { LlmSettings } from "./application/llmSettings";
import { loadGeneratedPacks, loadPackLibrary, type PackLibrary } from "./application/packLibrary";
import type { LlmProvider } from "./ports/LlmProvider";
import type { PackRepository } from "./ports/PackRepository";
import { loadLearnerState, type LearnerStorage } from "./application/learnerState";
import syllabusJson from "./content/syllabus.json";
import { QUANTITY_SAMPLES } from "./content/onboarding/quantitySamples";
import { parseSyllabus } from "./domain/course/Syllabus";
import { ok, type Result } from "./domain/shared/Result";
import type { ValidationIssue } from "./domain/shared/ValidationIssue";
import { CourseApp } from "./ui/shell/CourseApp";
import "./ui/theme/theme.css";

const packParts = import.meta.glob(["../packs/hecho-a-mano/*.json", "../packs/presets/*/*.json"], {
  eager: true,
  import: "default",
});
const catalogFiles = import.meta.glob("./content/locales/*/*.json", {
  eager: true,
  import: "default",
});
const syntaxChecker = new TreeSitterSyntaxChecker({
  runtime: runtimeWasm,
  grammars: { typescript: typescriptWasm, python: pythonWasm, ruby: rubyWasm },
});
const templateFiles = import.meta.glob("./generation/languages/*/templates/*.mustache", {
  eager: true,
  import: "default",
  query: "?raw",
});

async function openStorage(): Promise<{
  readonly storage: LearnerStorage;
  readonly packs: PackRepository;
}> {
  const database = await openLearnerDatabase();
  if (!database.ok) {
    return {
      storage: {
        progress: new InMemoryProgressRepository(),
        preferences: new InMemoryPreferencesRepository(),
      },
      packs: new InMemoryPackRepository(),
    };
  }
  return {
    storage: {
      progress: new IndexedDbProgressRepository(database.value),
      preferences: new IndexedDbPreferencesRepository(database.value),
    },
    packs: new IndexedDbPackRepository(database.value),
  };
}

/** The ways to reach a language model: directly with a key, through the host, or a prepared simulation. */
function providerFactory(
  library: PackLibrary,
  bridge: HostBridge,
): (settings: LlmSettings) => LlmProvider {
  return (settings) => {
    switch (settings.provider) {
      case "anthropic":
        return new AnthropicProvider({ apiKey: settings.apiKey, model: settings.model });
      case "openai":
        return new OpenAiCompatibleProvider({
          apiKey: settings.apiKey,
          model: settings.model,
          baseUrl: settings.baseUrl,
        });
      case "host":
        return new HostLlmProvider(bridge);
      case "simulated":
        return new SimulatedLlmProvider(
          (library.presets[0] ?? { pack: library.defaultPack }).pack,
          {
            failFirst: "model",
            delayMilliseconds: 900,
          },
        );
    }
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

function buildApp(): Result<
  { readonly library: PackLibrary; readonly shared: CourseSharedInput },
  readonly ValidationIssue[]
> {
  const library = loadPackLibrary(packParts);
  if (!library.ok) return library;
  const syllabus = parseSyllabus(syllabusJson);
  if (!syllabus.ok) return syllabus;

  return ok({
    library: library.value,
    shared: {
      syllabus: syllabus.value,
      catalogs: loadCatalogs(catalogFiles),
      languageSamples: QUANTITY_SAMPLES,
      templates: loadTemplates(templateFiles),
    },
  });
}

/** The channel to the page that embeds the course; only pages the address names as the host are trusted. */
function openHostBridge(): HostBridge {
  const origins = (new URLSearchParams(window.location.search).get("hostOrigin") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin !== "");
  const [first, ...rest] = origins;
  if (window.parent === window || first === undefined) return new NoHostBridge();
  return new PostMessageHostBridge({ listener: window, host: window.parent }, [first, ...rest]);
}

async function start(): Promise<void> {
  const built = buildApp();
  if (!built.ok) {
    showIssues(built.error);
    return;
  }
  const { shared } = built.value;
  const { storage, packs } = await openStorage();
  const library = { ...built.value.library, generated: await loadGeneratedPacks(packs) };
  const bridge = openHostBridge();
  const initial = await loadLearnerState(storage, navigator.languages);

  const container = document.getElementById("root");
  if (container === null) throw new Error("the page has no #root element");
  createRoot(container).render(
    <StrictMode>
      <CourseApp
        library={library}
        shared={shared}
        storage={storage}
        syntaxChecker={syntaxChecker}
        bridge={bridge}
        hostRunner={new HostRunner(bridge)}
        packRepository={packs}
        createLlmProvider={providerFactory(library, bridge)}
        initial={initial}
      />
    </StrictMode>,
  );
}

void start();
