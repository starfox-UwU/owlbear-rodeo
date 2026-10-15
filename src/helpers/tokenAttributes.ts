import { v4 as uuid } from "uuid";

import colors from "./colors";
import {
  TokenAttributeBar,
  TokenAttributeState,
  TokenAttributeValue,
} from "../types/TokenState";

export type ParseNumberError =
  | "empty"
  | "invalidNumber"
  | "invalidFormat"
  | "divideByZero"
  | "invalidResult";

export type ParseNumberResult =
  | { ok: true; value: number }
  | {
      ok: false;
      /** 稳定错误码，由界面层翻译成当前语言（本文件是纯函数，拿不到语言上下文） */
      code: ParseNumberError;
      /** 对应的翻译键，调用方直接 `t(result.errorKey)` 即可 */
      errorKey: `misc.tokenAttributeErrors.${ParseNumberError}`;
    };

function parseError(code: ParseNumberError) {
  return {
    ok: false as const,
    code,
    errorKey: `misc.tokenAttributeErrors.${code}` as const,
  };
}

const DEFAULT_BAR_COLOR = colors.red;

export function createEmptyAttributes(userId: string, now = Date.now()): TokenAttributeState {
  return {
    bars: [],
    values: [],
    version: 0,
    updatedAt: now,
    updatedBy: userId || "unknown",
  };
}

export function createDefaultBar(): TokenAttributeBar {
  return {
    id: uuid(),
    label: "HP",
    current: 0,
    min: 0,
    max: 10,
    color: DEFAULT_BAR_COLOR,
    showMinMax: true,
    visibility: "public",
  };
}

export function createDefaultValue(): TokenAttributeValue {
  return {
    id: uuid(),
    label: "Value",
    value: 0,
    color: colors.blue,
    visibility: "public",
  };
}

export function buildNextAttributes(
  prev: TokenAttributeState | undefined,
  nextBars: TokenAttributeBar[],
  nextValues: TokenAttributeValue[],
  userId: string,
  now = Date.now()
): TokenAttributeState {
  return {
    bars: nextBars,
    values: nextValues,
    version: prev?.version ?? 0,
    updatedAt: now,
    updatedBy: userId || prev?.updatedBy || "unknown",
  };
}

export function cloneAttributesWithNewIds(
  source: TokenAttributeState,
  userId: string,
  now = Date.now()
): TokenAttributeState {
  return {
    bars: (source.bars || []).map((bar) => ({ ...bar, id: uuid() })),
    values: (source.values || []).map((value) => ({ ...value, id: uuid() })),
    version: 0,
    updatedAt: now,
    updatedBy: userId || source.updatedBy || "unknown",
  };
}

export function parseNumericExpression(
  current: number,
  rawInput: string
): ParseNumberResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return parseError("empty");
  }
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return parseError("empty");
  }
  const first = tokens[0];
  const firstOp = first[0];
  if (
    tokens.length === 1 &&
    firstOp !== "+" &&
    firstOp !== "-" &&
    firstOp !== "*" &&
    firstOp !== "/" &&
    firstOp !== "="
  ) {
    const parsed = Number(first);
    if (!Number.isFinite(parsed)) {
      return parseError("invalidNumber");
    }
    return { ok: true, value: parsed };
  }

  let result = current;
  for (const token of tokens) {
    const op = token[0];
    if (op !== "+" && op !== "-" && op !== "*" && op !== "/" && op !== "=") {
      return parseError("invalidFormat");
    }
    const payload = token.slice(1).trim();
    const parsed = Number(payload);
    if (!Number.isFinite(parsed)) {
      return parseError("invalidNumber");
    }
    if (op === "+") {
      result = result + parsed;
    } else if (op === "-") {
      result = result - parsed;
    } else if (op === "*") {
      result = result * parsed;
    } else if (op === "/") {
      if (parsed === 0) {
        return parseError("divideByZero");
      }
      result = result / parsed;
    } else if (op === "=") {
      result = parsed;
    }
    if (!Number.isFinite(result)) {
      return parseError("invalidResult");
    }
  }
  return { ok: true, value: result };
}
