export {
  LANGUAGES,
  LANGUAGE_OPTIONS,
  LANGUAGE_LABELS,
  dictionaries,
  detectLanguage,
  resolveLanguage,
  translate,
  languageTag,
} from "./core";
export type {
  Language,
  LanguagePreference,
  TranslationKey,
} from "./core";

export { I18nProvider, useI18n, useTranslation } from "./I18nContext";
export type { I18nContextValue } from "./I18nContext";
