import { buildScenes } from "../content/scenes/buildScenes";
import type { Syllabus } from "../domain/course/Syllabus";
import type { ProgrammingLanguageId } from "../domain/language/ProgrammingLanguage";
import type { FlatCatalog } from "../domain/locale/compareCatalogs";
import type { LocaleCode } from "../domain/locale/LocaleRegistry";
import { buildPackIndex, type PackIndex } from "../domain/pack/PackIndex";
import { evolveIndex } from "../domain/pack/patch/evolveIndex";
import type { SemanticallyValidPack } from "../domain/pack/validation/validateSemantics";
import type { Scene } from "../domain/wall/Scene";
import type { TemplatesByLanguage } from "./loadTemplates";

/** Everything the UI needs to run the course: the pack it renders over, the syllabus, the scenes and the texts. */
export interface CourseSession {
  readonly index: PackIndex;
  /** The pack after the evolution scenario, for module 10; undefined if the change cannot be applied. */
  readonly evolved: PackIndex | undefined;
  readonly syllabus: Syllabus;
  readonly scenes: readonly Scene[];
  /** Catalogs of every locale, keys prefixed by namespace: "course.modules.why-ddd.title". */
  readonly catalogs: Readonly<Record<LocaleCode, FlatCatalog>>;
  /** The same small value object in each programming language, shown while the learner chooses. */
  readonly languageSamples: Readonly<Record<ProgrammingLanguageId, string>>;
  /** The generation templates of every programming language, bundled with the app. */
  readonly templates: TemplatesByLanguage;
}

export interface StartCourseInput {
  readonly pack: SemanticallyValidPack;
  readonly syllabus: Syllabus;
  readonly catalogs: Readonly<Record<LocaleCode, FlatCatalog>>;
  readonly languageSamples: CourseSession["languageSamples"];
  readonly templates: TemplatesByLanguage;
}

/** Use case: start the course over a validated pack. */
export function startCourse(input: StartCourseInput): CourseSession {
  const index = buildPackIndex(input.pack);
  return {
    index,
    evolved: evolveIndex(index),
    syllabus: input.syllabus,
    scenes: buildScenes(index),
    catalogs: input.catalogs,
    languageSamples: input.languageSamples,
    templates: input.templates,
  };
}
