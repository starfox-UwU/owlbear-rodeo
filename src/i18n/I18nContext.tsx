import React, {
  useContext,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from "react";

import { translate } from "./core";
import type {
  Language,
  LanguagePreference,
  TranslationKey,
} from "./core";

import useSetting from "../hooks/useSetting";
import { languageTag, resolveLanguage } from "./core";

type I18nContextValue = {
  /** 实际生效的语言 */
  language: Language;
  /** 用户的语言偏好（可能是 system） */
  preference: LanguagePreference;
  /** 修改语言偏好 */
  setPreference: (preference: LanguagePreference) => void;
  /** 翻译函数，例如 `t("settings.title")` */
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
};

const I18nContext = React.createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useSetting<LanguagePreference>("language");

  const language = useMemo(() => resolveLanguage(preference), [preference]);

  // 同步 <html lang>，让浏览器据此选择字体、断词与朗读规则
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = languageTag(language);
    }
  }, [language]);

  const t = useCallback(
    (key: TranslationKey, values?: Record<string, string | number>) =>
      translate(language, key, values),
    [language]
  );

  const value = useMemo(
    () => ({ language, preference, setPreference, t }),
    [language, preference, setPreference, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

/** 只要翻译函数的简写用法 */
export function useTranslation() {
  return useI18n().t;
}

export default I18nContext;
