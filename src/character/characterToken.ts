/**
 * 角色卡数值 → 枭熊 Token 的映射。
 *
 * 设计要点：
 * - 车卡结果落到 Token 的 `defaultAttributes`（条 + 数值），游玩时点开 Token 即可
 *   用现有的属性编辑器清晰修改；
 * - 图像优先使用角色卡头像；没有头像时用「名字首字 + 稳定配色」的占位图，
 *   占位图同样是普通素材，可以在 Token 编辑器里随时替换；
 * - Token 上记录 `characterId`，用于「重新同步角色数值 / 重新同步头像」。
 */
import { v4 as uuid } from "uuid";

import colors from "../helpers/colors";
import type { Asset } from "../types/Asset";
import type { FileToken } from "../types/Token";
import type {
  TokenAttributeBar,
  TokenAttributeState,
  TokenAttributeValue,
} from "../types/TokenState";

import type { CardSummary } from "./types";

/** 生成 Token 时使用的默认尺寸（像素）与占位图边长。 */
export const PLACEHOLDER_SIZE = 256;

const PALETTE = [
  colors.blue,
  colors.orange,
  colors.purple,
  colors.green,
  colors.pink,
  colors.teal,
  colors.red,
  colors.yellow,
];

const HP_COLOR = colors.red;

function stableIndex(value: string, modulo: number) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 100000;
  }
  return hash % modulo;
}

/** 把摘要里的数值整理成 Token 属性（1 条 HP 条 + 常用数值）。 */
export function summaryToAttributes(
  summary: CardSummary,
  userId: string,
  now = Date.now()
): TokenAttributeState {
  const maxHp = Math.max(1, summary.hp.max || summary.maxHp || 1);
  const currentHp = Math.max(0, summary.hp.current ?? maxHp);

  const bars: TokenAttributeBar[] = [
    {
      id: uuid(),
      label: "HP",
      current: currentHp,
      min: 0,
      max: maxHp,
      color: HP_COLOR,
      showMinMax: true,
      visibility: "public",
    },
  ];

  if (summary.hp.temp > 0) {
    bars.push({
      id: uuid(),
      label: "临时HP",
      current: summary.hp.temp,
      min: 0,
      max: Math.max(summary.hp.temp, 1),
      color: colors.teal,
      showMinMax: false,
      visibility: "public",
    });
  }

  const values: TokenAttributeValue[] = [];
  const push = (label: string, value: number | string, color?: string) => {
    if (value === "" || value === undefined || value === null) return;
    if (typeof value === "number" && !Number.isFinite(value)) return;
    values.push({
      id: uuid(),
      label,
      value,
      ...(color ? { color } : {}),
      visibility: "public",
    });
  };

  push("AC", summary.ac);
  push("先攻", summary.initiative);
  push("速度", summary.speed);
  push("熟练", summary.proficiency);
  push("被动察觉", summary.passive);
  if (summary.spellcasting) {
    push("法术DC", summary.spellcasting.dc);
    push("法术攻击", summary.spellcasting.attack);
  }
  for (const ability of summary.abilities) {
    push(ability.label, ability.modifier);
  }
  if (summary.hitDice) {
    push("生命骰", summary.hitDice);
  }
  if (summary.inspiration) {
    push("激励", summary.inspiration);
  }

  return {
    bars,
    values,
    version: 0,
    updatedAt: now,
    updatedBy: userId || "unknown",
  };
}

/** 摘要里可以直接画进占位图的短标签。 */
function placeholderLabel(name: string) {
  const trimmed = (name || "").trim();
  if (!trimmed) return "?";
  // 中文取首字；西文取首字母（大写）。
  const first = Array.from(trimmed)[0];
  return /[a-z]/i.test(first) ? first.toUpperCase() : first;
}

/**
 * 生成占位图（圆形底色 + 名字首字）。返回 PNG 字节和 data URL。
 */
export function renderPlaceholder(
  summary: CardSummary,
  size = PLACEHOLDER_SIZE
): Promise<{ data: Uint8Array; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) {
      reject(new Error("无法创建画布上下文"));
      return;
    }
    const background = PALETTE[stableIndex(summary.name || summary.id, PALETTE.length)];
    context.clearRect(0, 0, size, size);
    context.fillStyle = background;
    context.beginPath();
    context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    context.closePath();
    context.fill();

    context.lineWidth = size * 0.06;
    context.strokeStyle = "rgba(0, 0, 0, 0.55)";
    context.beginPath();
    context.arc(size / 2, size / 2, size / 2 - size * 0.03, 0, Math.PI * 2);
    context.closePath();
    context.stroke();

    context.fillStyle = "#ffffff";
    context.font = `600 ${Math.round(size * 0.44)}px system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(placeholderLabel(summary.name), size / 2, size / 2 + size * 0.02);

    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("占位图生成失败"));
        return;
      }
      blob
        .arrayBuffer()
        .then((buffer) => {
          resolve({
            data: new Uint8Array(buffer),
            width: size,
            height: size,
          });
        })
        .catch(reject);
    }, "image/png");
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("角色头像无法读取"));
    image.src = source;
  });
}

async function toPngBytes(image: HTMLImageElement): Promise<Uint8Array | undefined> {
  const canvas = document.createElement("canvas");
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) return undefined;
  // 头像过大时压缩到 512 以内，避免 Token 素材过重。
  const scale = Math.min(1, 512 / Math.max(width, height));
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) return undefined;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((value) => resolve(value), "image/png")
  );
  if (!blob) return undefined;
  return new Uint8Array(await blob.arrayBuffer());
}

export type CharacterTokenResult = {
  token: FileToken;
  assets: Asset[];
};

/**
 * 依据角色摘要生成一个带占位图/头像、带属性、可继续编辑的 Token。
 */
export async function createTokenFromSummary(
  summary: CardSummary,
  userId: string,
  options: { size?: number; attributes?: TokenAttributeState } = {}
): Promise<CharacterTokenResult> {
  const owner = userId || "unknown";
  const assets: Asset[] = [];

  let width = options.size ?? PLACEHOLDER_SIZE;
  let height = width;
  let bytes: Uint8Array | undefined;
  let outline: FileToken["outline"] = {
    type: "circle",
    x: width / 2,
    y: height / 2,
    radius: width / 2,
  };

  if (summary.portrait) {
    try {
      const image = await loadImage(summary.portrait);
      bytes = await toPngBytes(image);
      if (bytes) {
        width = Math.min(512, image.naturalWidth || image.width || PLACEHOLDER_SIZE);
        height = Math.min(512, image.naturalHeight || image.height || PLACEHOLDER_SIZE);
        outline = { type: "rect", x: 0, y: 0, width, height };
      }
    } catch {
      bytes = undefined;
    }
  }

  if (!bytes) {
    const placeholder = await renderPlaceholder(summary, options.size ?? PLACEHOLDER_SIZE);
    bytes = placeholder.data;
    width = placeholder.width;
    height = placeholder.height;
    outline = { type: "circle", x: width / 2, y: height / 2, radius: width / 2 };
  }

  const asset: Asset = {
    id: uuid(),
    file: bytes,
    width,
    height,
    mime: "image/png",
    owner,
    size: bytes.byteLength,
    originalName: `${summary.name || "character"}.png`,
    source: "local",
  };
  assets.push(asset);

  const token: FileToken = {
    id: uuid(),
    type: "file",
    name: summary.name || "未命名角色",
    defaultSize: 1,
    defaultCategory: "character",
    defaultLabel: "",
    hideInSidebar: false,
    width,
    height,
    file: asset.id,
    thumbnail: asset.id,
    outline,
    owner,
    created: Date.now(),
    lastModified: Date.now(),
    defaultAttributes: options.attributes ?? summaryToAttributes(summary, owner),
    characterId: summary.id,
  };

  return { token, assets };
}

/** 替换已有角色 Token 的图像（保留 id 与链接关系）。 */
export async function buildReplacementAsset(
  source: { kind: "portrait"; portrait: string } | { kind: "file"; file: File },
  userId: string,
  name: string
): Promise<{ asset: Asset; width: number; height: number; outline: FileToken["outline"] } | undefined> {
  const owner = userId || "unknown";
  try {
    let bytes: Uint8Array | undefined;
    let width = 0;
    let height = 0;
    if (source.kind === "portrait") {
      const image = await loadImage(source.portrait);
      bytes = await toPngBytes(image);
      width = image.naturalWidth || image.width;
      height = image.naturalHeight || image.height;
    } else {
      bytes = new Uint8Array(await source.file.arrayBuffer());
      const url = URL.createObjectURL(source.file);
      const image = await loadImage(url);
      width = image.naturalWidth || image.width;
      height = image.naturalHeight || image.height;
      URL.revokeObjectURL(url);
    }
    if (!bytes || !width || !height) return undefined;
    const asset: Asset = {
      id: uuid(),
      file: bytes,
      width,
      height,
      mime: source.kind === "portrait" ? "image/png" : source.file.type || "image/png",
      owner,
      size: bytes.byteLength,
      originalName: name,
      source: "local",
    };
    return {
      asset,
      width,
      height,
      outline: { type: "rect", x: 0, y: 0, width, height },
    };
  } catch {
    return undefined;
  }
}
