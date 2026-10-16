/**
 * 宿主桥接：把角色卡工作区暴露给嵌入它的父页面（枭熊 / 自建 VTT）。
 *
 * 设计约束：
 * - 只暴露「纯数据」接口，不把内部 React 结构或存储细节泄漏给宿主；
 * - 摘要（summary）刻意做轻量，只带车卡→Token 需要的数值，避免把上万个规则条目
 *   通过 postMessage 搬运导致页面卡死；
 * - 完整导出（full）才返回 `exportLinkedOwlbear` 的重快照，按需调用。
 *
 * 单机直接打开时 `window.parent === window`，此时只挂载全局 API，不发消息。
 */
import {
  ABILITIES,
  ABILITY_LABELS,
  SKILLS,
  type Ability,
  type Character,
} from '../core/model';
import { evaluate } from '../core/engine';
import { exportLinkedOwlbear } from '../core/export';
import { importOwlbear, parseFile, readCharacter } from '../core/validation';
import { inventoryState, spellState, spellValues } from '../core/characterDetails';
import { weaponAttacks } from '../core/weaponAttacks';
import { loadWorkspace, saveWorkspace, type Workspace } from './storage';

export const HOST_BRIDGE_VERSION = 1;
const CHANNEL = '__dndCardBridge';

export type CardAbilityLine = {
  key: Ability;
  label: string;
  score: number;
  modifier: number;
  save: number;
  saveProficient: boolean;
};

export type CardSkillLine = {
  key: string;
  label: string;
  ability: Ability;
  value: number;
  proficient: boolean;
  expertise: boolean;
};

export type CardWeaponLine = {
  key: string;
  name: string;
  attack: string;
  damage: string;
};

export type CardResourceLine = {
  id: string;
  name: string;
  current: number;
  max: number;
  unlimited: boolean;
};

/** 车卡页 → 宿主的轻量角色摘要。用于列表展示与 Token 生成。 */
export type CardSummary = {
  id: string;
  name: string;
  player: string;
  edition: '2014' | '2024';
  level: number;
  updatedAt: string;
  size: string | null;
  classes: { name: string; level: number; subclass: string | null }[];
  abilities: CardAbilityLine[];
  skills: CardSkillLine[];
  weapons: CardWeaponLine[];
  resources: CardResourceLine[];
  coins: Record<string, number>;
  ac: number;
  initiative: number;
  speed: number;
  proficiency: number;
  passive: number;
  maxHp: number;
  hp: { current: number; temp: number; max: number };
  hitDice: string;
  spellcasting: { ability: Ability | null; abilityLabel: string | null; dc: number; attack: number } | null;
  inspiration: number;
  /** 卡片头像（data URL）。仅在明确请求 `portrait` 时返回。 */
  portrait?: string;
};

function activeSelections(character: Character) {
  return character.selections.filter((selection) => {
    const disabled = character.profile.disabledEntries;
    return !disabled || !disabled.includes(selection.entry.id);
  });
}

function classLines(character: Character) {
  const active = activeSelections(character);
  const classes = active.filter((selection) => selection.entry.kind === 'class');
  const subclass = active.find((selection) => selection.entry.kind === 'subclass');
  return classes.map((selection) => ({
    name: selection.entry.name,
    level: selection.level,
    subclass: subclass?.entry.name ?? null,
  }));
}

function abilityLines(character: Character, derived: ReturnType<typeof evaluate>): CardAbilityLine[] {
  return ABILITIES.map((key) => ({
    key,
    label: ABILITY_LABELS[key],
    score: derived.abilities[key],
    modifier: derived.modifiers[key],
    save: derived.saves[key].value,
    saveProficient: derived.saves[key].proficient,
  }));
}

function skillLines(derived: ReturnType<typeof evaluate>): CardSkillLine[] {
  return Object.entries(derived.skills).map(([key, skill]) => ({
    key,
    label: SKILLS[key]?.name ?? key,
    ability: SKILLS[key]?.ability ?? 'str',
    value: skill.value,
    proficient: skill.proficient,
    expertise: skill.expertise,
  }));
}

function weaponLines(character: Character, derived: ReturnType<typeof evaluate>): CardWeaponLine[] {
  try {
    return weaponAttacks(character, derived).map((weapon) => ({
      key: weapon.key,
      name: weapon.name,
      attack: String(weapon.attack_bonus ?? ''),
      damage: String(weapon.damage ?? ''),
    }));
  } catch {
    return [];
  }
}

function resourceLines(character: Character): CardResourceLine[] {
  const stored = character.runtime?.resources ?? {};
  return Object.entries(stored).map(([id, resource]) => ({
    id,
    name: resource.name || id,
    current: resource.current,
    max: resource.max,
    unlimited: !!resource.unlimited,
  }));
}

/**
 * 生成一个角色的摘要。`derived` 可复用调用方的求值结果，避免重复计算。
 */
export function buildSummary(
  character: Character,
  derived = evaluate(character),
  options: { portrait?: boolean } = {}
): CardSummary {
  const coins = { ...inventoryState(character).coins };
  const spell = spellValues(character, derived);
  const spellAbility = spellState(character).ability ?? null;
  const summary: CardSummary = {
    id: character.id,
    name: character.name,
    player: character.player,
    edition: character.edition,
    level: derived.level,
    updatedAt: character.updatedAt,
    size: character.size ?? null,
    classes: classLines(character),
    abilities: abilityLines(character, derived),
    skills: skillLines(derived),
    weapons: weaponLines(character, derived),
    resources: resourceLines(character),
    coins,
    ac: derived.ac,
    initiative: derived.initiative,
    speed: derived.speed,
    proficiency: derived.proficiency,
    passive: derived.passive,
    maxHp: derived.maxHp,
    hp: {
      current: character.runtime?.hp ?? derived.maxHp,
      temp: character.runtime?.tempHp ?? 0,
      max: derived.maxHp,
    },
    hitDice: derived.hitDice,
    spellcasting:
      spellAbility && spell.dc > 0
        ? {
            ability: spellAbility,
            abilityLabel: ABILITY_LABELS[spellAbility],
            dc: spell.dc,
            attack: spell.attack,
          }
        : null,
    inspiration: character.runtime?.inspiration ?? 0,
  };
  if (options.portrait && character.portrait?.data) {
    summary.portrait = character.portrait.data;
  }
  return summary;
}

/* ------------------------------------------------------------------ *
 * 工作区读写
 * ------------------------------------------------------------------ */

async function readWorkspaceSafe(): Promise<Workspace> {
  const workspace = await loadWorkspace();
  if (workspace) return workspace;
  return { schemaVersion: 1, characters: [], activeId: '', packs: [] };
}

async function writeWorkspace(next: Workspace) {
  await saveWorkspace(next);
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('dnd-card-workspace');
      channel.postMessage({ saved: true });
      channel.close();
    }
  } catch {
    /* 广播失败不影响写入结果。 */
  }
}

function toCharacter(payload: unknown): Character {
  const value = typeof payload === 'string' ? parseFile(payload) : payload;
  const native =
    (value as any)?.dnd_card_web ??
    ((value as any)?.format === 'dnd-card-web' ? (value as any).character : undefined) ??
    ((value as any)?.schemaVersion === 1 ? value : undefined);
  if (native) return readCharacter(native).character;
  return importOwlbear(value);
}

/* ------------------------------------------------------------------ *
 * 桥接 API
 * ------------------------------------------------------------------ */

export type CardBridgeApi = {
  version: number;
  ready: true;
  list(): Promise<CardSummary[]>;
  summary(id: string): Promise<CardSummary | undefined>;
  full(ids: string[]): Promise<unknown[]>;
  /** 用完整角色数据合并写回工作区，返回新增/覆盖数量。 */
  importPayloads(payloads: unknown[]): Promise<{ added: number; updated: number; ids: string[] }>;
  setActive(id: string): Promise<void>;
};

async function listSummaries(): Promise<CardSummary[]> {
  const workspace = await readWorkspaceSafe();
  // 上万条规则条目在 selections 里；这里只对角色本身求值，逐条处理避免一次性峰值。
  return workspace.characters.map((character) => buildSummary(character));
}

async function summariesFor(id: string): Promise<CardSummary | undefined> {
  const workspace = await readWorkspaceSafe();
  const character = workspace.characters.find((item) => item.id === id);
  if (!character) return undefined;
  return buildSummary(character, evaluate(character), { portrait: true });
}

async function fullPayloads(ids: string[]): Promise<unknown[]> {
  const workspace = await readWorkspaceSafe();
  const wanted = new Set(ids);
  return workspace.characters
    .filter((character) => wanted.has(character.id))
    .map((character) => exportLinkedOwlbear(character, evaluate(character)));
}

async function importPayloads(payloads: unknown[]) {
  const workspace = await readWorkspaceSafe();
  const characters = [...workspace.characters];
  const ids: string[] = [];
  let added = 0;
  let updated = 0;
  for (const payload of payloads) {
    let character: Character;
    try {
      character = toCharacter(payload);
    } catch {
      continue;
    }
    const index = characters.findIndex((item) => item.id === character.id);
    if (index >= 0) {
      characters[index] = character;
      updated += 1;
    } else {
      characters.push(character);
      added += 1;
    }
    ids.push(character.id);
  }
  if (ids.length === 0) return { added, updated, ids };
  await writeWorkspace({
    ...workspace,
    schemaVersion: 1,
    characters,
    activeId: workspace.activeId || ids[0],
  });
  return { added, updated, ids };
}

async function setActive(id: string) {
  const workspace = await readWorkspaceSafe();
  if (workspace.activeId === id) return;
  if (!workspace.characters.some((character) => character.id === id)) return;
  await writeWorkspace({ ...workspace, activeId: id });
}

let api: CardBridgeApi | undefined;

export function getBridgeApi(): CardBridgeApi {
  if (api) return api;
  api = {
    version: HOST_BRIDGE_VERSION,
    ready: true,
    list: listSummaries,
    summary: summariesFor,
    full: fullPayloads,
    importPayloads,
    setActive,
  };
  return api;
}

type BridgeRequest = { [CHANNEL]: true; kind: 'request'; id: number; method: string; params?: unknown };

function isRequest(value: unknown): value is BridgeRequest {
  return !!value && typeof value === 'object' && (value as any)[CHANNEL] === true && (value as any).kind === 'request';
}

function embedded() {
  return typeof window !== 'undefined' && window.parent && window.parent !== window;
}

function post(message: Record<string, unknown>) {
  if (!embedded()) return;
  try {
    window.parent.postMessage({ [CHANNEL]: true, ...message }, window.location.origin);
  } catch {
    /* 跨源父页面（理论不会出现）静默忽略。 */
  }
}

export function notifyHost(event: string, data?: unknown) {
  post({ kind: 'event', event, data });
}

async function handleRequest(message: BridgeRequest) {
  const handlers: Record<string, (params: any) => Promise<unknown>> = {
    list: () => listSummaries(),
    summary: (params) => summariesFor(String(params?.id ?? '')),
    full: (params) => fullPayloads(Array.isArray(params?.ids) ? params.ids.map(String) : []),
    importPayloads: (params) =>
      importPayloads(Array.isArray(params?.payloads) ? params.payloads : []),
    setActive: (params) => setActive(String(params?.id ?? '')),
    ping: async () => ({ version: HOST_BRIDGE_VERSION }),
  };
  const handler = handlers[message.method];
  if (!handler) throw new Error(`未知的桥接方法：${message.method}`);
  return handler(message.params);
}

let installed = false;

/** 安装桥接。可重复调用，只有第一次生效。 */
export function installHostBridge() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const bridge = getBridgeApi();
  (window as any).__DND_CARD_BRIDGE__ = bridge;

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    if (embedded() && event.source !== window.parent) return;
    if (!isRequest(event.data)) return;
    const message = event.data;
    handleRequest(message)
      .then((result) => {
        post({ kind: 'response', id: message.id, ok: true, result });
      })
      .catch((error: unknown) => {
        post({
          kind: 'response',
          id: message.id,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });
  });

  // 角色卡自己保存后通知宿主刷新列表。
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('dnd-card-workspace');
      channel.addEventListener('message', () => notifyHost('workspace-changed'));
    }
  } catch {
    /* 无 BroadcastChannel 时宿主仍可手动刷新。 */
  }

  post({ kind: 'event', event: 'ready', data: { version: HOST_BRIDGE_VERSION } });
}
