import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { SettingsProvider } from "../contexts/SettingsContext";
import { I18nProvider, useI18n } from "../i18n";
import LanguageToggle from "./LanguageToggle";
import Footer from "./Footer";

function CurrentLabel() {
  const { t } = useI18n();
  return <span data-testid="label">{t("language.label")}</span>;
}

function renderShell() {
  return render(
    <SettingsProvider>
      <I18nProvider>
        {/* Footer 里的导航链接依赖 Router */}
        <MemoryRouter>
          <LanguageToggle />
          <Footer />
        </MemoryRouter>
        <CurrentLabel />
      </I18nProvider>
    </SettingsProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    "OwlbearRodeoSettings",
    JSON.stringify({ __version: 18, language: "zh" })
  );
  cleanup();
});

describe("LanguageToggle", () => {
  it("shows the language you would switch to", () => {
    renderShell();
    // 当前是中文，所以按钮上是目标语言 English
    expect(screen.getAllByTitle("English").length).toBeGreaterThan(0);
  });

  it("switches the whole tree when clicked", async () => {
    renderShell();
    expect(screen.getByTestId("label")).toHaveTextContent("语言");

    await userEvent.click(screen.getAllByTitle("English")[0]);

    expect(screen.getByTestId("label")).toHaveTextContent("Language");
    // 切过去之后按钮应该指向中文
    expect(screen.getAllByTitle("简体中文").length).toBeGreaterThan(0);
  });

  it("persists the switch", async () => {
    renderShell();
    await userEvent.click(screen.getAllByTitle("English")[0]);

    const saved = JSON.parse(
      localStorage.getItem("OwlbearRodeoSettings") as string
    );
    expect(saved.language).toBe("en");
  });

  it("keeps the footer usable in both languages", async () => {
    renderShell();
    expect(screen.getByText("首页")).toBeInTheDocument();

    await userEvent.click(screen.getAllByTitle("English")[0]);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.queryByText("首页")).not.toBeInTheDocument();
  });
});
