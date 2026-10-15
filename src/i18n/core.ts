import en from "../resources/en";
import zh from "../resources/zh";

/**
 * 支持的语言。
 * - `zh` 简体中文
 * - `en` English
 */
export const LANGUAGES = ["zh", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

/**
 * 语言偏好：
 * - `system` 跟随浏览器语言（默认）
 * - 其余为显式选择的语言
 */
export const LANGUAGE_OPTIONS = ["system", ...LANGUAGES] as const;
export type LanguagePreference = (typeof LANGUAGE_OPTIONS)[number];

/** 语言的母语显示名（无论当前界面语言是什么，用户都能认出自己的语言） */
export const LANGUAGE_LABELS: Record<Language, string> = {
  zh: "简体中文",
  en: "English",
};

const LANGUAGE_TAGS: Record<Language, string> = {
  zh: "zh-CN",
  en: "en",
};

/** 所有语言包。英文是基准，中文用 `satisfies` 与之对齐。 */
export const dictionaries = { zh, en } as const;

/** 文案键路径，例如 `settings.title` */
export type TranslationKey = DeepKeys<typeof en>;

type Primitive = string | number | boolean | null | undefined;

type DeepKeys<T> = T extends Primitive
  ? never
  : {
      [K in keyof T & string]: T[K] extends object
        ? `${K}.${DeepKeys<T[K]>}`
        : K;
    }[keyof T & string];

/**
 * 检测浏览器偏好的语言。
 * 浏览器不可用或语言不受支持时回退到简体中文。
 */
export function detectLanguage(): Language {
  if (typeof navigator === "undefined") {
    return "zh";
  }
  const candidates = [...(navigator.languages ?? []), navigator.language].filter(
    (tag): tag is string => typeof tag === "string"
  );
  for (const tag of candidates) {
    const normalized = tag.toLowerCase();
    if (normalized.startsWith("zh")) {
      return "zh";
    }
    if (normalized.startsWith("en")) {
      return "en";
    }
  }
  return "zh";
}

function isLanguage(value: unknown): value is Language {
  return (
    typeof value === "string" &&
    (LANGUAGES as readonly string[]).includes(value)
  );
}

/** 把语言偏好解析成实际生效的语言 */
export function resolveLanguage(preference: LanguagePreference): Language {
  return isLanguage(preference) ? preference : detectLanguage();
}

/** 按语言与键路径取出文案，并替换 `{{name}}` 占位符 */
export function translate(
  language: Language,
  key: TranslationKey,
  values?: Record<string, string | number>
): string {
  const value =
    getPath(dictionaries[language], key) ?? getPath(dictionaries.en, key);
  if (typeof value !== "string") {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] 缺少文案: "${key}" (${language})`);
    }
    return key;
  }
  return values ? interpolate(value, values) : value;
}

function getPath(object: unknown, path: string): unknown {
  return path.split(".").reduce<any>((current, part) => {
    if (current === undefined || current === null) {
      return undefined;
    }
    return current[part];
  }, object);
}

function interpolate(
  template: string,
  values: Record<string, string | number>
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name) =>
    name in values ? String(values[name]) : match
  );
}

/** BCP-47 语言标签，用于 `<html lang>` 等场景 */
export function languageTag(language: Language): string {
  return LANGUAGE_TAGS[language];
}
