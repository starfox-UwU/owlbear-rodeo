import { describe, expect, it, afterEach, vi } from "vitest";

import en from "../resources/en";
import zh from "../resources/zh";
import {
  detectLanguage,
  resolveLanguage,
  translate,
  languageTag,
  LANGUAGE_LABELS,
  LANGUAGES,
} from "./core";

function stubNavigator(language: string, languages: string[]) {
  vi.stubGlobal("navigator", { language, languages });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("detectLanguage", () => {
  it("detects Chinese from a zh-CN browser", () => {
    stubNavigator("zh-CN", ["zh-CN", "zh"]);
    expect(detectLanguage()).toBe("zh");
  });

  it("detects English from an en-US browser", () => {
    stubNavigator("en-US", ["en-US", "en"]);
    expect(detectLanguage()).toBe("en");
  });

  it("falls back to the first supported language in the list", () => {
    // fr 不支持，但列表里后面有 en
    stubNavigator("fr-FR", ["fr-FR", "en-GB"]);
    expect(detectLanguage()).toBe("en");
  });

  it("falls back to Chinese when nothing is supported", () => {
    stubNavigator("de-DE", ["de-DE"]);
    expect(detectLanguage()).toBe("zh");
  });

  it("handles Traditional Chinese tags", () => {
    stubNavigator("zh-TW", ["zh-TW"]);
    expect(detectLanguage()).toBe("zh");
  });
});

describe("resolveLanguage", () => {
  it("returns the explicit language when one is chosen", () => {
    stubNavigator("en-US", ["en-US"]);
    expect(resolveLanguage("zh")).toBe("zh");
    expect(resolveLanguage("en")).toBe("en");
  });

  it("follows the browser when the preference is 'system'", () => {
    stubNavigator("en-US", ["en-US"]);
    expect(resolveLanguage("system")).toBe("en");

    stubNavigator("zh-CN", ["zh-CN"]);
    expect(resolveLanguage("system")).toBe("zh");
  });
});

describe("translate", () => {
  it("returns Chinese copy for zh", () => {
    expect(translate("zh", "home.startGame")).toBe("创建游戏");
  });

  it("returns English copy for en", () => {
    expect(translate("en", "home.startGame")).toBe("Start Game");
  });

  it("interpolates {{placeholders}}", () => {
    expect(translate("en", "home.legacyVersion", { version: "1.10.2" })).toBe(
      "Legacy v1.10.2"
    );
    expect(translate("zh", "home.legacyVersion", { version: "1.10.2" })).toBe(
      "旧版 v1.10.2"
    );
  });

  it("keeps unmatched placeholders instead of printing undefined", () => {
    expect(translate("en", "home.legacyVersion")).toBe("Legacy v{{version}}");
  });
});

describe("dictionary shape", () => {
  function keyPaths(value: unknown, prefix = ""): string[] {
    if (value === null || typeof value !== "object") {
      return [prefix];
    }
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key)
    );
  }

  it("has an exact key parity between English and Chinese", () => {
    expect(keyPaths(zh).sort()).toEqual(keyPaths(en).sort());
  });

  /** 英文基准里允许为空的键：中文也允许为空 */
  const allowEmpty = new Set(["dialogs.confirm.defaultDescription"]);

  it("has no empty copy in Chinese", () => {
    // 英文基准里允许出现「可选、默认不展示」的空串，中文作为实际展示语言不允许。
    for (const path of keyPaths(zh)) {
      if (allowEmpty.has(path)) {
        continue;
      }
      const value = path
        .split(".")
        .reduce<any>((current, part) => current?.[part], zh);
      expect(value, `zh:${path} 不应为空`).toBeTruthy();
    }
  });

  it("keeps interpolation placeholders in sync across languages", () => {
    const placeholders = (value: string) =>
      [...value.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort();

    for (const path of keyPaths(en)) {
      const enValue = path
        .split(".")
        .reduce<any>((current, part) => current?.[part], en);
      const zhValue = path
        .split(".")
        .reduce<any>((current, part) => current?.[part], zh);
      expect(placeholders(zhValue), `${path} 的占位符应与英文一致`).toEqual(
        placeholders(enValue)
      );
    }
  });
});

describe("language metadata", () => {
  it("labels every language in its own script", () => {
    for (const language of LANGUAGES) {
      expect(LANGUAGE_LABELS[language]).toBeTruthy();
    }
    expect(LANGUAGE_LABELS.zh).toBe("简体中文");
    expect(LANGUAGE_LABELS.en).toBe("English");
  });

  it("maps languages to BCP-47 tags", () => {
    expect(languageTag("zh")).toBe("zh-CN");
    expect(languageTag("en")).toBe("en");
  });
});
