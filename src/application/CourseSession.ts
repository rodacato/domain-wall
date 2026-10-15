import { buildScenes } from "../content/scenes/buildScenes";
import type { Syllabus } from "../domain/course/Syllabus";
import type { ProgrammingLanguageId } from "../domain/language/ProgrammingLanguage";
import type { FlatCatalog } from "../domain/locale/compareCatalogs";
import type { LocaleCode } from "../domain/locale/LocaleRegistry";
import { buildPackIndex, type PackIndex } from "../domain/pack/PackIndex";
import type { SemanticallyValidPack } from "../domain/pack/validation/validateSemantics";
import type { Scene } from "../domain/wall/Scene";

/** Everything the UI needs to run the course: the pack it renders over, the syllabus, the scenes and the texts. */
export interface CourseSession {
  readonly index: PackIndex;
  readonly syllabus: Syllabus;
  readonly scenes: readonly Scene[];
  /** Catalogs of every locale, keys prefixed by namespace: "course.modules.why-ddd.title". */
  readonly catalogs: Readonly<Record<LocaleCode, FlatCatalog>>;
  /** The same small value object in each programming language, shown while the learner chooses. */
  readonly languageSamples: Readonly<Record<ProgrammingLanguageId, string>>;
}

export interface StartCourseInput {
  readonly pack: SemanticallyValidPack;
  readonly syllabus: Syllabus;
  readonly catalogs: Readonly<Record<LocaleCode, FlatCatalog>>;
  readonly languageSamples: CourseSession["languageSamples"];
}

/** Use case: start the course over a validated pack. */
export function startCourse(input: StartCourseInput): CourseSession {
  const index = buildPackIndex(input.pack);
  return {
    index,
    syllabus: input.syllabus,
    scenes: buildScenes(index),
    catalogs: input.catalogs,
    languageSamples: input.languageSamples,
  };
}
