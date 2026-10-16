import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ProgrammingLanguageId } from "../../src/domain/language/ProgrammingLanguage";

/** The real toolchain that runs generated code for one language, on the same versions as Dojo's Piston (ADR 7). */
export interface Toolchain {
  /** Compiles if needed and runs the test entry; returns everything the tests printed to stdout. */
  readonly run: (projectDirectory: string, scratchDirectory: string) => string;
}

const BUFFER = 64 * 1024 * 1024;

function capture(
  command: string,
  args: readonly string[],
  options: { readonly cwd?: string } = {},
): string {
  return execFileSync(command, [...args], {
    encoding: "utf8",
    maxBuffer: BUFFER,
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}

const typescriptToolchain: Toolchain = {
  run: (projectDirectory, scratchDirectory) => {
    const emptyTypes = join(scratchDirectory, "empty-types");
    const output = join(scratchDirectory, "js");
    mkdirSync(emptyTypes, { recursive: true });
    capture("pnpm", [
      "dlx",
      "--package=typescript@5.0.3",
      "tsc",
      "--strict",
      "--typeRoots",
      emptyTypes,
      "--outDir",
      output,
      join(projectDirectory, "run-tests.ts"),
    ]);
    writeFileSync(join(output, "package.json"), '{ "type": "commonjs" }\n');
    return capture("node", [join(output, "run-tests.js")]);
  },
};

/** Runs a command inside a container of the official image, with the project mounted read-only. */
function inContainer(image: string, projectDirectory: string, command: readonly string[]): string {
  return capture("docker", [
    "run",
    "--rm",
    "--network=none",
    "--volume",
    `${resolve(projectDirectory)}:/project:ro`,
    "--workdir",
    "/project",
    image,
    ...command,
  ]);
}

const pythonToolchain: Toolchain = {
  run: (projectDirectory) =>
    inContainer("python:3.10-slim", projectDirectory, ["python", "-B", "run_tests.py"]),
};

const rubyToolchain: Toolchain = {
  run: (projectDirectory) =>
    inContainer("ruby:3.0.1-slim", projectDirectory, ["ruby", "run_tests.rb"]),
};

const TOOLCHAINS: Partial<Record<ProgrammingLanguageId, Toolchain>> = {
  typescript: typescriptToolchain,
  python: pythonToolchain,
  ruby: rubyToolchain,
};

export function toolchainFor(language: ProgrammingLanguageId): Toolchain | undefined {
  return TOOLCHAINS[language];
}
