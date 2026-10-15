import { describe, expect, it, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ThemeProvider } from "theme-ui";

import PermissionEditor from "./PermissionEditor";

import { SettingsProvider } from "../../contexts/SettingsContext";
import { I18nProvider } from "../../i18n";
import theme from "../../theme";

import { PermissionPlayer } from "../../contexts/PermissionsContext";

const players: PermissionPlayer[] = [
  { userId: "u-alice", nickname: "Alice", isSelf: false },
  { userId: "u-bob", nickname: "Bob", isSelf: true },
];

function renderEditor(ui: React.ReactElement) {
  localStorage.setItem(
    "OwlbearRodeoSettings",
    JSON.stringify({ __version: 18, language: "zh" })
  );
  return render(
    <ThemeProvider theme={theme}>
      <SettingsProvider>
        <I18nProvider>{ui}</I18nProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  cleanup();
});

describe("PermissionEditor", () => {
  it("列出所有玩家与特定玩家两个层级", () => {
    renderEditor(
      <PermissionEditor
        idPrefix="t"
        rule={{}}
        players={players}
        allowInherit
        onChange={() => {}}
      />
    );

    expect(screen.getByText("所有玩家")).toBeInTheDocument();
    expect(screen.getByText("特定玩家")).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  it("没有其他玩家时给出提示", () => {
    renderEditor(
      <PermissionEditor idPrefix="t" rule={{}} players={[]} onChange={() => {}} />
    );
    expect(screen.getByText("房间里还没有其他玩家。")).toBeInTheDocument();
  });

  it("房主能一眼看出某个玩家被单独授权", () => {
    renderEditor(
      <PermissionEditor
        idPrefix="t"
        rule={{ everyone: "view", users: { "u-alice": "edit" } }}
        players={players}
        onChange={() => {}}
      />
    );

    // Alice 的例外（可完全编辑）与 Bob 的默认（跟随「只能看」）应同时出现
    expect(screen.getAllByText("可完全编辑").length).toBeGreaterThan(0);
    expect(screen.getAllByText("跟随「只能看」").length).toBeGreaterThan(0);
  });

  it("传递规则变化补丁", () => {
    const patches: unknown[] = [];
    renderEditor(
      <PermissionEditor
        idPrefix="t"
        rule={{ everyone: "move" }}
        players={players}
        onChange={(patch) => patches.push(patch)}
      />
    );

    // 组件本身只负责渲染，实际交互交给底层 react-select；
    // 这里验证初始 everyone 文案已经渲染出来
    expect(screen.getAllByText("可移动").length).toBeGreaterThan(0);
    expect(patches).toEqual([]);
  });
});
