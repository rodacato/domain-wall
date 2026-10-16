import { execFileSync } from "node:child_process";
import { PROGRAMMING_LANGUAGES } from "../src/domain/language/ProgrammingLanguage";
import { toolchainFor } from "./lib/toolchains";

const [packDirectory, languageArgument] = process.argv.slice(2);
const language = PROGRAMMING_LANGUAGES.find((candidate) => candidate === languageArgument);
if (packDirectory === undefined || language === undefined) {
  console.error("usage: run-generated <pack directory> <language>");
  process.exit(2);
}
const toolchain = toolchainFor(language);
if (toolchain === undefined) {
  console.error(`no toolchain for ${language} yet`);
  process.exit(2);
}

const packName = packDirectory.split("/").pop() ?? packDirectory;
const projectDirectory = `build/generated/${packName}/${language}`;
const scratchDirectory = `build/scratch/${packName}/${language}`;

execFileSync(
  "pnpm",
  ["exec", "tsx", "scripts/generate-project.ts", packDirectory, language, projectDirectory],
  { stdio: "inherit" },
);

let output: string;
try {
  output = toolchain.run(projectDirectory, scratchDirectory);
} catch (failure) {
  const detail =
    failure instanceof Error && "stdout" in failure
      ? String((failure as { stdout: unknown }).stdout)
      : "";
  const errors =
    failure instanceof Error && "stderr" in failure
      ? String((failure as { stderr: unknown }).stderr)
      : String(failure);
  console.error(`✗ ${packName} · ${language}: the generated code did not build or run`);
  console.error(`${detail}${errors}`.split("\n").slice(0, 40).join("\n"));
  process.exit(1);
}

const results = output
  .split("\n")
  .filter((line) => line.startsWith("{"))
  .map(
    (line) =>
      JSON.parse(line) as {
        type: string;
        name?: string;
        status?: string;
        message?: string;
        passed?: number;
        failed?: number;
      },
  );
const failures = results.filter((result) => result.type === "test" && result.status === "failed");
const summary = results.find((result) => result.type === "summary");

if (failures.length > 0 || summary?.failed !== 0) {
  console.error(`✗ ${packName} · ${language}: ${failures.length} failing test(s)`);
  for (const failure of failures)
    console.error(`  ${failure.name ?? "?"}: ${failure.message ?? ""}`);
  process.exit(1);
}
console.log(`✓ ${packName} · ${language}: ${summary.passed ?? 0} generated tests passed`);
