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

  const open = useCallback(() => {
    setMounted(true);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);
  const ensureMounted = useCallback(() => setMounted(true), []);
  const toggle = useCallback(() => {
    setMounted(true);
    setIsOpen((prev) => !prev);
  }, []);

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
      onLoad={state.onFrameLoad}
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
        {state.error && (
          <Flex
            bg="muted"
            sx={{ alignItems: "center", justifyContent: "space-between", px: 3, py: 2 }}
          >
            <Text variant="body2">{t("character.loadFailed", { message: state.error })}</Text>
            <Button variant="secondary" onClick={() => void state.refresh()}>
              {t("common.reset")}
            </Button>
          </Flex>
        )}
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
