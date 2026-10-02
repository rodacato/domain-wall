import { readFileSync } from "node:fs";
import { parseSyllabus, type Syllabus } from "../../src/domain/course/Syllabus";
import type { Result } from "../../src/domain/shared/Result";
import type { ValidationIssue } from "../../src/domain/shared/ValidationIssue";

export const SYLLABUS_FILE = "src/content/syllabus.json";

export function loadSyllabus(): Result<Syllabus, readonly ValidationIssue[]> {
  return parseSyllabus(JSON.parse(readFileSync(SYLLABUS_FILE, "utf8")));
}
