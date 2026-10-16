import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PROGRAMMING_LANGUAGES } from "../src/domain/language/ProgrammingLanguage";
import { buildPackIndex } from "../src/domain/pack/PackIndex";
import { validateSemantics } from "../src/domain/pack/validation/validateSemantics";
import { generateProject } from "../src/generation/generateProject";
import { descriptorFor } from "../src/generation/languages/descriptors";
import { loadPackDirectory } from "./lib/loadPackDirectory";
import { loadTemplates } from "./lib/loadTemplates";

const [packDirectory, languageArgument, outputDirectory] = process.argv.slice(2);
if (
  packDirectory === undefined ||
  languageArgument === undefined ||
  outputDirectory === undefined
) {
  console.error("usage: generate-project <pack directory> <language> <output directory>");
  process.exit(2);
}
const language = PROGRAMMING_LANGUAGES.find((candidate) => candidate === languageArgument);
const descriptor = language === undefined ? undefined : descriptorFor(language);
if (language === undefined || descriptor === undefined) {
  console.error(`no generator for "${languageArgument}"`);
  process.exit(2);
}

const loaded = loadPackDirectory(packDirectory);
const validated = loaded.ok ? validateSemantics(loaded.value) : loaded;
if (!validated.ok) {
  for (const issue of validated.error)
    console.error(`[${issue.ruleId}] ${issue.path}: ${issue.message}`);
  process.exit(1);
}

const generated = generateProject(
  buildPackIndex(validated.value),
  descriptor,
  loadTemplates(language),
);
if (!generated.ok) {
  for (const problem of generated.error) console.error(problem);
  process.exit(1);
}

rmSync(outputDirectory, { recursive: true, force: true });
for (const file of generated.value.files) {
  const target = join(outputDirectory, file.path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${file.content.replace(/\n+$/, "")}\n`);
}
console.log(`generated ${generated.value.files.length} ${language} files into ${outputDirectory}`);
