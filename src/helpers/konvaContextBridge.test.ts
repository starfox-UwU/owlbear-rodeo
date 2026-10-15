import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * 结构性回归测试（不需要 canvas）。
 *
 * react-konva 的 `<Stage>` 另起一棵 React 渲染树，子节点看不到主应用的 context，
 * 所以 KonvaBridge 必须把每个用到的 context 显式转发一次。
 *
 * 之前的真实事故：Token.tsx 用了 useI18n()，但 KonvaBridge 没转发 I18nContext，
 * 结果放置指示物 / 切换地图时抛
 * "Uncaught Error: useI18n must be used within an I18nProvider"。
 *
 * 这个测试扫描所有「会被 Konva 渲染」的组件，把其中用到的 context hook 提出来，
 * 逐个断言 KonvaBridge 里有对应的 Provider——漏转发就会失败。
 */

/** 会被 Konva 渲染子树的目录与文件 */
const KONVA_RENDERED = [
  "src/components/konva",
  "src/components/tools",
  "src/components/spellTemplates",
  "src/components/map/MapGridEditor.tsx",
  "src/components/map/FogOfWarLayer.tsx",
  "src/network/NetworkedMapPointer.tsx",
];

/** 这些 hook 名字像 context 但不是（普通自定义 hook） */
const NOT_CONTEXT_HOOKS = new Set([
  "useGridSnapping", // 基于 useSetting，不依赖 Konva 树里的 Provider
  "useImage",
  "useSetting",
  "useSpring",
  "usePrevious",
  "useDebounce",
  "useResponsiveLayout",
  "usePreventSelect",
  "usePreventTouch",
  "usePreventOverscroll",
  "usePreventContextMenu",
  "useKeyboard",
  "useBlur",
  "useImageCenter",
  "useMapSelection",
  "useMapActions",
  "useNetworkedState",
  "useStageInteraction",
  "useTokenNotes",
  "useMapNotes",
  "useDataURL",
  "usePortal",
  "useAnchorImage",
]);

/** React 内置 hook，不是 context */
const REACT_BUILTINS =
  /^use(State|Effect|LayoutEffect|Memo|Callback|Ref|Context|Reducer|ImperativeHandle|DebugValue|Transition|DeferredValue|Id|SyncExternalStore|InsertionEffect)/;

function collectFiles(target: string, out: string[] = []): string[] {
  const full = target;
  let stat: ReturnType<typeof readdirSync> extends never ? never : unknown;
  try {
    stat = readdirSync(full);
  } catch {
    return out;
  }
  if (typeof stat === "object" && stat !== null && (stat as string[]).length >= 0) {
    for (const name of stat as string[]) {
      const child = join(full, name);
      if (name.endsWith(".tsx") || name.endsWith(".ts")) {
        out.push(child.replaceAll("\\", "/"));
      } else if (!name.includes(".")) {
        collectFiles(child, out);
      }
    }
  }
  return out;
}

function contextHooksIn(source: string): Set<string> {
  const hooks = new Set<string>();
  for (const match of source.matchAll(/\b(use[A-Z][A-Za-z0-9]*)\s*\(/g)) {
    const name = match[1];
    if (NOT_CONTEXT_HOOKS.has(name)) continue;
    if (REACT_BUILTINS.test(name)) continue;
    hooks.add(name);
  }
  return hooks;
}

describe("KonvaBridge 必须转发 Konva 子树用到的全部 context", () => {
  const bridge = readFileSync("src/helpers/KonvaBridge.tsx", "utf8");
  const files = KONVA_RENDERED.flatMap((target) => collectFiles(target));
  const hooks = new Set<string>();
  for (const file of files) {
    for (const hook of contextHooksIn(readFileSync(file, "utf8"))) {
      hooks.add(hook);
    }
  }

  it("确实扫到了 Konva 子树的文件", () => {
    expect(files.length).toBeGreaterThan(10);
    expect(hooks.size).toBeGreaterThan(5);
  });

  it.each([...hooks].sort())("%s 已在 KonvaBridge 里转发", (hook) => {
    // useMapStage -> <MapStageProvider>，其余都是 useXxx -> <XxxContext.Provider>
    if (hook === "useMapStage") {
      expect(bridge).toContain("MapStageProvider");
      return;
    }
    const context = `${hook.slice(3)}Context`;
    expect(bridge).toContain(`<${context}.Provider`);
  });
});
