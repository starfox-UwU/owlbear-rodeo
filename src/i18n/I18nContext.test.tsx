import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SettingsProvider } from "../contexts/SettingsContext";
import { I18nProvider, useI18n } from "./I18nContext";
import { LANGUAGE_LABELS } from "./core";

/**
 * 语言切换是这次改造的核心需求，这里用真实组件树验证：
 * 切换语言后文案立刻变化，并且偏好被持久化到 localStorage。
 */
function Probe() {
  const { t, language, setPreference } = useI18n();
  return (
    <div>
      <span data-testid="label">{t("language.label")}</span>
      <span data-testid="language">{language}</span>
      <button onClick={() => setPreference("en")}>to-en</button>
      <button onClick={() => setPreference("zh")}>to-zh</button>
      <button onClick={() => setPreference("system")}>to-system</button>
    </div>
  );
}

function renderApp(language: string) {
  localStorage.setItem(
    "OwlbearRodeoSettings",
    JSON.stringify({ __version: 18, language })
  );
  return render(
    <SettingsProvider>
      <I18nProvider>
        <Probe />
      </I18nProvider>
    </SettingsProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  cleanup();
});

describe("I18nProvider", () => {
  it("renders Chinese when the saved preference is zh", () => {
    renderApp("zh");
    expect(screen.getByTestId("label")).toHaveTextContent("语言");
    expect(screen.getByTestId("language")).toHaveTextContent("zh");
  });

  it("renders English when the saved preference is en", () => {
    renderApp("en");
    expect(screen.getByTestId("label")).toHaveTextContent("Language");
    expect(screen.getByTestId("language")).toHaveTextContent("en");
  });

  it("switches the visible copy without a reload", async () => {
    renderApp("zh");
    expect(screen.getByTestId("label")).toHaveTextContent("语言");

    await userEvent.click(screen.getByText("to-en"));

    expect(screen.getByTestId("label")).toHaveTextContent("Language");
    expect(screen.getByTestId("language")).toHaveTextContent("en");
  });

  it("persists the choice so it survives a reload", async () => {
    renderApp("zh");
    await userEvent.click(screen.getByText("to-en"));

    const saved = JSON.parse(
      localStorage.getItem("OwlbearRodeoSettings") as string
    );
    expect(saved.language).toBe("en");

    // 模拟刷新：重新挂载整个树
    cleanup();
    renderApp(saved.language);
    expect(screen.getByTestId("label")).toHaveTextContent("Language");
  });

  it("follows the browser again after choosing 'system'", async () => {
    vi.stubGlobal("navigator", { language: "en-US", languages: ["en-US"] });
    renderApp("zh");
    expect(screen.getByTestId("label")).toHaveTextContent("语言");

    await userEvent.click(screen.getByText("to-system"));

    expect(screen.getByTestId("language")).toHaveTextContent("en");
    expect(screen.getByTestId("label")).toHaveTextContent("Language");
    vi.unstubAllGlobals();
  });

  it("exposes母语 labels so the switcher is always readable", () => {
    expect(LANGUAGE_LABELS.zh).toBe("简体中文");
    expect(LANGUAGE_LABELS.en).toBe("English");
  });
});
