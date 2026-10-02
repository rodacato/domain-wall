import { flattenCatalog, type FlatCatalog } from "../domain/locale/compareCatalogs";
import {
  SUPPORTED_LOCALES,
  isSupportedLocale,
  type LocaleCode,
} from "../domain/locale/LocaleRegistry";

/**
 * Builds the catalogs of every locale from files named `.../locales/<locale>/<namespace>.json`.
 * Keys are prefixed with the namespace: a "course.json" entry `modules.why-ddd.title` becomes
 * `course.modules.why-ddd.title`.
 */
export function loadCatalogs(
  filesByPath: Readonly<Record<string, unknown>>,
): Readonly<Record<LocaleCode, FlatCatalog>> {
  const catalogs = Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, {}])) as Record<
    LocaleCode,
    Record<string, string>
  >;
  for (const [path, content] of Object.entries(filesByPath)) {
    const match = /\/locales\/([^/]+)\/([^/]+)\.json$/.exec(path);
    const locale = match?.[1];
    const namespace = match?.[2];
    if (locale === undefined || namespace === undefined || !isSupportedLocale(locale)) continue;
    for (const [key, message] of Object.entries(flattenCatalog(content))) {
      catalogs[locale][`${namespace}.${key}`] = message;
    }
  }
  return catalogs;
}
