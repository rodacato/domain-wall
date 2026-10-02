import { readFileSync } from "node:fs";
import { flattenCatalog } from "../src/domain/locale/compareCatalogs";
import { SUPPORTED_LOCALES } from "../src/domain/locale/LocaleRegistry";
import { requiredCourseCatalogKeys } from "../src/domain/course/Syllabus";
import { loadSyllabus } from "./lib/loadSyllabus";

const syllabus = loadSyllabus();
if (!syllabus.ok) {
  console.error("✗ syllabus is invalid");
  for (const issue of syllabus.error) console.error(`  ${issue.path}: ${issue.message}`);
  process.exit(1);
}

const required = new Set(requiredCourseCatalogKeys(syllabus.value));
let problems = 0;
for (const locale of SUPPORTED_LOCALES) {
  const catalog = flattenCatalog(
    JSON.parse(readFileSync(`src/content/locales/${locale}/course.json`, "utf8")),
  );
  for (const key of required) {
    if (!(key in catalog)) {
      console.error(`✗ ${locale}: course catalog lacks "${key}"`);
      problems += 1;
    }
  }
  for (const key of Object.keys(catalog)) {
    if (!required.has(key)) {
      console.error(`✗ ${locale}: course catalog has "${key}", which the syllabus does not use`);
      problems += 1;
    }
  }
}
if (problems > 0) process.exit(1);
console.log(
  `✓ course: ${syllabus.value.modules.length} modules, catalogs complete in ${SUPPORTED_LOCALES.join(", ")}`,
);
