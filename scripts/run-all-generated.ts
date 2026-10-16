import { spawnSync } from "node:child_process";
import { PROGRAMMING_LANGUAGES } from "../src/domain/language/ProgrammingLanguage";
import { packDirectories } from "./lib/packDirectories";
import { toolchainFor } from "./lib/toolchains";

const requested = process.argv.slice(2);
const languages = PROGRAMMING_LANGUAGES.filter(
  (language) =>
    toolchainFor(language) !== undefined &&
    (requested.length === 0 || requested.includes(language)),
);

let failures = 0;
for (const language of languages) {
  for (const directory of packDirectories()) {
    const run = spawnSync(
      "pnpm",
      ["exec", "tsx", "scripts/run-generated.ts", directory, language],
      {
        stdio: ["ignore", "inherit", "inherit"],
      },
    );
    if (run.status !== 0) failures += 1;
  }
}
process.exit(failures === 0 ? 0 : 1);
