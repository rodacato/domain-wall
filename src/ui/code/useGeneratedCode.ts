import { useMemo } from "react";
import type { CourseSession } from "../../application/CourseSession";
import { generateCode } from "../../application/generateCode";
import type { GeneratedProject } from "../../application/codeView";
import type { ProgrammingLanguageId } from "../../domain/language/ProgrammingLanguage";
import type { Result } from "../../domain/shared/Result";

/** The pack's code in the learner's language, generated once per language and kept while it does not change. */
export function useGeneratedCode(
  session: CourseSession,
  language: ProgrammingLanguageId,
): Result<GeneratedProject, readonly string[]> {
  return useMemo(
    () => generateCode(session.index, language, session.templates),
    [session.index, session.templates, language],
  );
}
