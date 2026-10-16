import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box, Button, Close, Flex, Text } from "theme-ui";

import {
  useCardBridge,
  useCharacterCard,
  type CardBridge,
  type CharacterCardState,
} from "./bridge";
import { useI18n } from "../i18n";

/**
 * 角色卡子应用的挂载路径（由 scripts/build-card.mjs 输出到 public/card）。
 * 必须用绝对路径：相对路径在 `/game/:id` 这类多级路由下会解析到错误位置。
 */
export const CARD_APP_URL = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/card/index.html`;

export type CharacterCardContextValue = {
  bridge: CardBridge;
  state: CharacterCardState;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** 只加载 iframe 而不显示，用于后台读取角色列表。 */
  ensureMounted: () => void;
  /** 已打开过一次后 iframe 常驻，切换只改可见性。 */
  mounted: boolean;
};

const CharacterCardContext = React.createContext<
  CharacterCardContextValue | undefined
>(undefined);

/** 加载完成后确认 iframe 里真的是角色卡，超时则拆掉它。 */
const FRAME_CHECK_TIMEOUT = 8_000;
const FRAME_CHECK_INTERVAL = 400;

/**
 * 判断 iframe 里装载的是不是角色卡本身。
 *
 * 静态服务器经常把所有找不到的路径（包括 `/card/index.html` 这种“带扩展名的
 * 嵌套 HTML”，例如 `serve -s` 的 cleanUrls）重写成宿主自己的 `index.html`。
 * 那样 iframe 里跑的就是宿主，宿主又会再套一层 iframe，形成无限嵌套。
 *
 * 角色卡的 `index.html` 会在解析阶段就写上 `data-card-startup`，宿主的不会，
 * 所以可以据此区分。
 *
 * @returns true 是角色卡；false 不是；undefined 无法判断（跨域或还没提交文档）。
 */
function frameIsCharacterCard(
  frame: HTMLIFrameElement | null
): boolean | undefined {
  let document_: Document | undefined;
  let contentWindow: (Window & { __DND_CARD_BRIDGE__?: unknown }) | null =
    null;
  try {
    contentWindow = frame?.contentWindow as
      | (Window & { __DND_CARD_BRIDGE__?: unknown })
      | null;
    document_ = contentWindow?.document ?? undefined;
  } catch {
    // 跨域（例如把 CARD_APP_URL 指到 CDN）时无法检查，交给宿主自己报错。
    return undefined;
  }
  if (!document_?.documentElement) return undefined;
  if (document_.documentElement.dataset.cardStartup) return true;
  if (contentWindow?.__DND_CARD_BRIDGE__) return true;
  return false;
}

export function CharacterCardProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const bridge = useCardBridge(frameRef);
  const state = useCharacterCard(bridge);
  const { t } = useI18n();

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  /** 静态服务器把 /card/index.html 改写成了宿主页面时的提示。 */
  const [frameError, setFrameError] = useState<string | null>(null);
  const frameCheck = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined
  );

  const stopFrameCheck = useCallback(() => {
    if (frameCheck.current !== undefined) {
      clearInterval(frameCheck.current);
      frameCheck.current = undefined;
    }
  }, []);

  useEffect(() => stopFrameCheck, [stopFrameCheck]);

  const open = useCallback(() => {
    setFrameError(null);
    setMounted(true);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);
  const ensureMounted = useCallback(() => setMounted(true), []);
  const toggle = useCallback(() => {
    setFrameError(null);
    setMounted(true);
    setIsOpen((prev) => !prev);
  }, []);

  /**
   * iframe 的 load 事件：先放行桥接请求，再确认里面确实是角色卡。
   * 如果被重写成了宿主页面，就卸掉 iframe 并报错，避免无限嵌套。
   */
  const onFrameLoad = useCallback(() => {
    state.onFrameLoad();
    stopFrameCheck();
    const deadline = Date.now() + FRAME_CHECK_TIMEOUT;
    frameCheck.current = setInterval(() => {
      const looksLikeCard = frameIsCharacterCard(frameRef.current);
      if (looksLikeCard !== false) {
        // true：正常；undefined：跨域或还没有文档，交给宿主自己的错误处理。
        stopFrameCheck();
        return;
      }
      if (Date.now() < deadline) return;
      stopFrameCheck();
      setFrameError(t("character.frameBlocked"));
      // 拆掉 iframe：里面那个“宿主”也会走同一段判断并把自己拆掉，递归到此为止。
      setMounted(false);
    }, FRAME_CHECK_INTERVAL);
  }, [state, stopFrameCheck, t]);

  // 角色卡浮层打开时锁住宿主页面滚动；关闭时恢复原来的值，
  // 避免把 react-modal 之类正在用的 inline overflow 冲掉。
  const previousOverflow = useRef<string | null>(null);
  useEffect(() => {
    if (isOpen) {
      if (previousOverflow.current === null) {
        previousOverflow.current = document.body.style.overflow;
      }
      document.body.style.overflow = "hidden";
      return;
    }
    if (previousOverflow.current !== null) {
      document.body.style.overflow = previousOverflow.current;
      previousOverflow.current = null;
    }
  }, [isOpen]);

  const value = useMemo<CharacterCardContextValue>(
    () => ({ bridge, state, isOpen, open, close, toggle, ensureMounted, mounted }),
    [bridge, state, isOpen, open, close, toggle, ensureMounted, mounted]
  );

  const frame = (
    <iframe
      ref={frameRef}
      title={t("character.frameTitle")}
      src={CARD_APP_URL}
      onLoad={onFrameLoad}
      style={{
        border: "none",
        width: "100%",
        height: "100%",
        display: "block",
        backgroundColor: "#2f3136",
      }}
    />
  );

  return (
    <CharacterCardContext.Provider value={value}>
      {children}
      {/*
        用普通 div + inline style 控制显示：
        角色卡 iframe 一旦加载就常驻，关闭时只是隐藏，避免重复加载与数据分叉。
      */}
      <div
        data-character-card-overlay={isOpen ? "open" : "closed"}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          zIndex: 200,
          display: isOpen ? "flex" : "none",
          flexDirection: "column",
          background: "#1e2029",
        }}
      >
        <Flex
          bg="muted"
          sx={{ alignItems: "center", justifyContent: "space-between", px: 3, py: 2 }}
        >
          <Text variant="heading" sx={{ fontSize: 2 }}>
            {t("character.title")}
          </Text>
          <Flex sx={{ alignItems: "center", gap: 2 }}>
            <Text variant="body2" sx={{ opacity: 0.7 }}>
              {state.characters
                ? t("character.count", { count: state.characters.length })
                : t("character.loading")}
            </Text>
            <Close
              title={t("common.close")}
              aria-label={t("common.close")}
              onClick={close}
              sx={{ position: "static" }}
            />
          </Flex>
        </Flex>
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>{mounted ? frame : null}</Box>
        {frameError ? (
          <Flex
            bg="muted"
            sx={{ alignItems: "center", justifyContent: "space-between", px: 3, py: 2 }}
          >
            <Text variant="body2">{frameError}</Text>
            <Button
              variant="secondary"
              onClick={() => {
                setFrameError(null);
                setMounted(true);
              }}
            >
              {t("common.reset")}
            </Button>
          </Flex>
        ) : state.error ? (
          <Flex
            bg="muted"
            sx={{ alignItems: "center", justifyContent: "space-between", px: 3, py: 2 }}
          >
            <Text variant="body2">{t("character.loadFailed", { message: state.error })}</Text>
            <Button variant="secondary" onClick={() => void state.refresh()}>
              {t("common.reset")}
            </Button>
          </Flex>
        ) : null}
      </div>
    </CharacterCardContext.Provider>
  );
}

export function useCharacterCardContext(): CharacterCardContextValue {
  const context = useContext(CharacterCardContext);
  if (context === undefined) {
    throw new Error(
      "useCharacterCardContext must be used within a CharacterCardProvider"
    );
  }
  return context;
}

/** 允许可选使用（未挂载 Provider 时返回 undefined，便于渐进增强）。 */
export function useOptionalCharacterCardContext() {
  return useContext(CharacterCardContext);
}
