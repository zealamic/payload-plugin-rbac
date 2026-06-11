import type { SelectField } from "payload";

/** Builds `{ [locale]: string }` from `getValue`, skipping empty values. */
export const toLocaleRecord = (
  locales: string[],
  getValue: (locale: string) => string | undefined,
): Record<string, string> =>
  locales.reduce<Record<string, string>>((acc, locale) => {
    const value = getValue(locale);
    if (value) {
      acc[locale] = value;
    }
    return acc;
  }, {});

/**
 * Select placeholder as per-locale strings (not `LabelFunction`) so it survives
 * Next.js server → client serialization; Payload resolves it at render time.
 */
export const toSelectPlaceholder = (
  locales: string[],
  getValue: (locale: string) => string | undefined,
): NonNullable<SelectField["admin"]>["placeholder"] =>
  toLocaleRecord(locales, getValue) as unknown as NonNullable<SelectField["admin"]>["placeholder"];

type TranslationObject = {
  [key: string]: TranslationValue;
};

type TranslationValue = TranslationObject | string | undefined;

const isPlainObject = (value: TranslationValue): value is TranslationObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Deep-merge translation trees; leaf overrides replace defaults. */
const mergeTranslationNodes = (
  defaultNode: TranslationValue,
  overrideNode: TranslationValue,
): TranslationValue => {
  if (isPlainObject(defaultNode) && isPlainObject(overrideNode)) {
    const merged: TranslationObject = { ...defaultNode };

    for (const key of Object.keys(overrideNode)) {
      merged[key] = mergeTranslationNodes(defaultNode[key], overrideNode[key]);
    }

    return merged;
  }

  return overrideNode ?? defaultNode;
};

/** Plugin defaults merged with host `translations` overrides. */
export const getMergedTranslations = <T extends Record<string, TranslationValue>>({
  defaultTranslations,
  translations,
}: {
  defaultTranslations: T;
  translations: Partial<T>;
}): T => mergeTranslationNodes(defaultTranslations, translations) as T;

/**
 * Picks a nested branch from each locale, e.g. path `"collections.roles"`.
 * Use `locales: "all"` or `["en", "vi"]`.
 */
export const getAllTranslationsOfSpecificObject = <T = unknown>({
  translations,
  path,
  locales = "all",
}: {
  translations: Record<string, Record<string, unknown>>;
  path: string;
  locales?: "all" | string[];
}): Record<string, T> => {
  const segments = path.split(".");
  const localeKeys = locales === "all" ? Object.keys(translations) : locales;

  return localeKeys.reduce<Record<string, T>>((acc, locale) => {
    const localeData = translations[locale];
    if (!localeData) {
      return acc;
    }

    let current: unknown = localeData;
    for (const segment of segments) {
      if (typeof current !== "object" || current === null || !(segment in current)) {
        current = undefined;
        break;
      }
      current = (current as Record<string, unknown>)[segment];
    }

    if (current !== undefined) {
      acc[locale] = current as T;
    }
    return acc;
  }, {});
};
