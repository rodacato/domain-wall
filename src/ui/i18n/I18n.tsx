import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import type { FlatCatalog } from "../../domain/locale/compareCatalogs";
import { CANONICAL_LOCALE, type LocaleCode } from "../../domain/locale/LocaleRegistry";

export type Translate = (
  key: string,
  parameters?: Readonly<Record<string, string | number>>,
) => string;

interface I18n {
  readonly locale: LocaleCode;
  readonly setLocale: (locale: LocaleCode) => void;
  readonly t: Translate;
}

const I18nContext = createContext<I18n | null>(null);

interface I18nProviderProps {
  readonly catalogs: Readonly<Record<LocaleCode, FlatCatalog>>;
  readonly locale: LocaleCode;
  readonly onLocaleChange: (locale: LocaleCode) => void;
  readonly children: ReactNode;
}

export function I18nProvider({
  catalogs,
  locale,
  onLocaleChange,
  children,
}: I18nProviderProps): ReactNode {
  const t = useCallback<Translate>(
    (key, parameters) => {
      const message = catalogs[locale][key] ?? catalogs[CANONICAL_LOCALE][key] ?? `⟪${key}⟫`;
      if (parameters === undefined) return message;
      return message.replace(/\{\s*([A-Za-z0-9_]+)\s*\}/g, (match, name: string) =>
        String(parameters[name] ?? match),
      );
    },
    [catalogs, locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale: onLocaleChange, t }),
    [locale, onLocaleChange, t],
  );
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (value === null) throw new Error("useI18n must be used inside an I18nProvider");
  return value;
}
