/**
 * 与角色卡 iframe 的 postMessage 客户端。
 *
 * 协议（同源，targetOrigin 固定为当前 origin）：
 *   { __dndCardBridge: true, kind: "request",  id, method, params }
 *   { __dndCardBridge: true, kind: "response", id, ok, result | error }
 *   { __dndCardBridge: true, kind: "event",    event, data }
 *
 * 请求在 iframe 就绪前会排队，避免首次挂载时的竞态。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";

import type { CardBridgeEvent, CardSummary, ImportResult } from "./types";

const CHANNEL = "__dndCardBridge";
const DEFAULT_TIMEOUT = 30_000;
/** 未收到 ready 事件时的兜底直发延迟。 */
const FALLBACK_FLUSH = 5_000;

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export type CardBridge = {
  request: <T = unknown>(method: string, params?: unknown) => Promise<T>;
  subscribe: (handler: (event: CardBridgeEvent) => void) => () => void;
  /** iframe 的 load 事件触发时调用，立刻放行排队请求。 */
  markReady: () => void;
  ready: boolean;
  dispose: () => void;
};

type BridgeMessage = {
  [CHANNEL]?: true;
  kind?: string;
  id?: number;
  ok?: boolean;
  result?: unknown;
  error?: string;
  event?: string;
  data?: unknown;
};

function isBridgeMessage(value: unknown): value is BridgeMessage {
  return (
    !!value && typeof value === "object" && (value as BridgeMessage)[CHANNEL] === true
  );
}

/**
 * 创建一个绑定到指定 iframe 窗口的客户端。
 * `getFrame` 为 null 时（尚未挂载）请求会挂起等待。
 */
export function createCardBridge(
  getFrame: () => HTMLIFrameElement | null,
  origin = window.location.origin
): CardBridge {
  const pending = new Map<number, Pending>();
  const queued: (() => void)[] = [];
  const listeners = new Set<(event: CardBridgeEvent) => void>();
  let ready = false;
  let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
  let nextId = 1;

  function targetWindow(): Window | null {
    return getFrame()?.contentWindow ?? null;
  }

  function markReady() {
    ready = true;
    if (fallbackTimer !== undefined) {
      clearTimeout(fallbackTimer);
      fallbackTimer = undefined;
    }
    const jobs = queued.splice(0, queued.length);
    for (const job of jobs) job();
  }

  function handleMessage(event: MessageEvent) {
    const frame = getFrame();
    if (!frame) return;
    if (event.source !== frame.contentWindow) return;
    if (event.origin !== origin) return;
    const message = event.data;
    if (!isBridgeMessage(message)) return;

    if (message.kind === "event") {
      if (message.event === "ready") markReady();
      const payload: CardBridgeEvent = {
        event: message.event ?? "",
        data: message.data,
      };
      for (const listener of listeners) listener(payload);
      return;
    }

    if (message.kind !== "response" || typeof message.id !== "number") return;
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    clearTimeout(entry.timer);
    if (message.ok) {
      entry.resolve(message.result);
    } else {
      entry.reject(new Error(message.error || "角色卡调用失败"));
    }
  }

  window.addEventListener("message", handleMessage);

  function send<T>(method: string, params?: unknown): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const win = targetWindow();
      if (!win) {
        reject(new Error("角色卡尚未加载"));
        return;
      }
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`角色卡响应超时：${method}`));
      }, DEFAULT_TIMEOUT);
      pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      });
      win.postMessage({ [CHANNEL]: true, kind: "request", id, method, params }, origin);
    });
  }

  return {
    get ready() {
      return ready;
    },
    markReady,
    request<T>(method: string, params?: unknown): Promise<T> {
      if (ready) return send<T>(method, params);
      return new Promise<T>((resolve, reject) => {
        let settled = false;
        const start = () => {
          if (settled) return;
          settled = true;
          send<T>(method, params).then(resolve, reject);
        };
        queued.push(start);
        if (fallbackTimer === undefined) {
          fallbackTimer = setTimeout(() => {
            fallbackTimer = undefined;
            markReady();
          }, FALLBACK_FLUSH);
        }
      });
    },
    subscribe(handler) {
      listeners.add(handler);
      return () => {
        listeners.delete(handler);
      };
    },
    dispose() {
      window.removeEventListener("message", handleMessage);
      if (fallbackTimer !== undefined) {
        clearTimeout(fallbackTimer);
        fallbackTimer = undefined;
      }
      for (const [, entry] of pending) {
        clearTimeout(entry.timer);
        entry.reject(new Error("角色卡已卸载"));
      }
      pending.clear();
      queued.length = 0;
      listeners.clear();
    },
  };
}

/**
 * 在组件中创建桥接，并在卸载时自动释放消息监听。
 * `frameRef` 需要指向承载角色卡的 iframe。
 */
export function useCardBridge(frameRef: RefObject<HTMLIFrameElement>): CardBridge {
  const bridge = useMemo(() => createCardBridge(() => frameRef.current), [frameRef]);
  useEffect(() => () => bridge.dispose(), [bridge]);
  return bridge;
}

export type CharacterCardState = {
  /** 角色列表；加载中或未就绪时为 null。 */
  characters: CardSummary[] | null;
  loading: boolean;
  error: string | null;
  ready: boolean;
  /** 传给 iframe 的 onLoad：桥接模块此时已安装，可以直接拉取角色列表。 */
  onFrameLoad: () => void;
  refresh: () => Promise<void>;
  loadSummary: (id: string) => Promise<CardSummary | undefined>;
  importPayloads: (payloads: unknown[]) => Promise<ImportResult>;
  setActive: (id: string) => Promise<void>;
  requestFull: (ids: string[]) => Promise<unknown[]>;
};

/** React 侧的角色卡数据源。 */
export function useCharacterCard(bridge: CardBridge): CharacterCardState {
  const [characters, setCharacters] = useState<CardSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const aliveRef = useRef(true);
  const hydratedRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await bridge.request<CardSummary[]>("list");
      if (!aliveRef.current) return;
      setCharacters(Array.isArray(list) ? list : []);
      setError(null);
      hydratedRef.current = true;
    } catch (err) {
      if (!aliveRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [bridge]);

  useEffect(() => {
    return bridge.subscribe((event) => {
      if (event.event === "ready") {
        setReady(true);
        void refresh();
      }
      if (event.event === "workspace-changed") {
        void refresh();
      }
    });
  }, [bridge, refresh]);

  /** iframe 的 load 事件：桥接模块此时已安装，可直接拉取列表。 */
  const onFrameLoad = useCallback(() => {
    bridge.markReady();
    if (!hydratedRef.current) {
      setReady(true);
      void refresh();
    }
  }, [bridge, refresh]);

  const loadSummary = useCallback(
    async (id: string) => bridge.request<CardSummary | undefined>("summary", { id }),
    [bridge]
  );

  const importPayloads = useCallback(
    async (payloads: unknown[]) => {
      const result = await bridge.request<ImportResult>("importPayloads", { payloads });
      await refresh();
      return result;
    },
    [bridge, refresh]
  );

  const setActive = useCallback(
    async (id: string) => {
      await bridge.request("setActive", { id });
    },
    [bridge]
  );

  const requestFull = useCallback(
    async (ids: string[]) => bridge.request<unknown[]>("full", { ids }),
    [bridge]
  );

  return useMemo(
    () => ({
      characters,
      loading,
      error,
      ready,
      refresh,
      loadSummary,
      importPayloads,
      setActive,
      requestFull,
      onFrameLoad,
    }),
    [
      characters,
      loading,
      error,
      ready,
      refresh,
      loadSummary,
      importPayloads,
      setActive,
      requestFull,
      onFrameLoad,
    ]
  );
}
