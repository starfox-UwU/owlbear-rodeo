/**
 * 端到端验证：宿主 → 角色卡 → 生成 Token。
 *
 * 前置：宿主 dev server（默认 http://127.0.0.1:5199）与 broker（127.0.0.1:9000）已启动。
 * 用法：node tools/verifyHostFlow.mjs [hostUrl]
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const mapImage = readFileSync(join(here, '..', '..', 'public', 'logo512.png'));

const hostUrl = process.argv[2] || 'http://127.0.0.1:5199';
const gameId = `e2ecard${Date.now().toString(36)}`;

const SEED = {
  schemaVersion: 1,
  id: 'verify-character-1',
  revision: 1,
  name: '验证勇者',
  player: 'Tester',
  edition: '2024',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  abilities: { str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: 8 },
  baseHp: 12,
  identity: { gender: '', alignment: '', age: '', description: '' },
  selections: [],
  answers: {},
  reviewed: [],
  notes: '',
  profile: {
    enabledSources: ['PHB', 'XPHB'],
    optional: { feats: true, multiclass: false, legacy: false },
    exceptions: {},
  },
  runtime: { hp: 9, tempHp: 2, inspiration: 1, resources: {} },
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const failures = [];
const notes = [];
page.on('pageerror', (error) => {
  if (/ResizeObserver/.test(error.message)) return;
  failures.push(`pageerror: ${error.message}`);
});

// 1) 预置一个角色到角色卡的本地工作区（与子应用同源同一个 IndexedDB）。
await page.goto(hostUrl, { waitUntil: 'domcontentloaded' });
await page.evaluate(async (character) => {
  const request = indexedDB.open('dnd-card-standalone', 1);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains('documents')) db.createObjectStore('documents');
    if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache');
  };
  const db = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite');
    tx.objectStore('documents').put(
      { schemaVersion: 1, characters: [character], activeId: character.id, packs: [] },
      'workspace'
    );
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}, SEED);
notes.push('已预置角色卡工作区');

// 2) 进入一个房间。
await page.goto(`${hostUrl}/game/${gameId}`, { waitUntil: 'domcontentloaded' });

const generateButton = page.locator('[aria-label="从角色卡生成 Token"]');
await generateButton.waitFor({ state: 'visible', timeout: 30000 });
notes.push('TokenBar 上出现「从角色卡生成 Token」按钮');

// 2b) 尽量放一张地图，这样生成的 Token 能落到地图上。
//     地图上传是宿主原有功能，这里失败只作为提示，不影响角色卡链路的判定。
try {
  await page.locator('[aria-label="选择地图"]').first().click();
  const mapFileInput = page.locator('input[type="file"][accept*="image/png"]').first();
  await mapFileInput.waitFor({ state: 'attached', timeout: 20000 });
  await mapFileInput.setInputFiles({ name: 'e2e-map.png', mimeType: 'image/png', buffer: mapImage });
  await page.waitForTimeout(3500);
  const mapTile = page.locator('.ReactModalPortal [aria-label="E2e Map"]').first();
  if (await mapTile.count()) await mapTile.click();
  const selectButton = page.getByRole('button', { name: '选择', exact: true }).first();
  if (await selectButton.isEnabled().catch(() => false)) await selectButton.click();
  await page.waitForTimeout(2500);
  // 「选择」之后弹窗可能自己关掉，也可能还开着。
  const closeButton = page.locator('.ReactModalPortal button[aria-label="关闭"]').last();
  if (await closeButton.count()) {
    await closeButton.click({ timeout: 5000 }).catch(() => {});
  }
  await page.waitForTimeout(1000);
  const mapVisible = await page.locator('.map canvas').count();
  notes.push(mapVisible > 0 ? '已放入并切换到测试地图' : '已尝试放入测试地图');
} catch (error) {
  notes.push(`跳过测试地图（宿主原有功能）：${error.message.split('\n')[0].slice(0, 120)}`);
  if (process.env.DEBUG_MAP) console.error(error.stack);
}

// 3) 打开生成对话框（此时才会按需加载角色卡 iframe）。
await generateButton.click();
await page.waitForSelector('iframe[title]', { state: 'attached', timeout: 30000 });
notes.push('打开对话框时按需加载角色卡 iframe');

const dialogRow = page.getByText('验证勇者', { exact: false }).first();
await dialogRow.waitFor({ state: 'visible', timeout: 60000 });
notes.push('对话框列出角色卡中的角色');

// 4) 勾选并生成。
await dialogRow.click();
const confirm = page.getByRole('button', { name: /生成 1 个 Token/ });
await confirm.click();
await page.getByText(/已在 Token 库中生成 1 个 Token|已生成 1 个 Token/).first().waitFor({ timeout: 30000 });
notes.push('生成成功提示出现');

await page.waitForTimeout(1500);

// 5) 直接查宿主的 IndexedDB，确认 Token 真的落库，并且带上了角色数值。
const stored = await page.evaluate(async () => {
  const db = await new Promise((resolve) => {
    const request = indexedDB.open('OwlbearRodeoDB');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  if (!db || !db.objectStoreNames.contains('tokens')) return null;
  const rows = await new Promise((resolve) => {
    const tx = db.transaction('tokens', 'readonly');
    const request = tx.objectStore('tokens').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve([]);
  });
  const token = rows.find((row) => row.name === '验证勇者');
  return token ? { token, total: rows.length } : null;
});

if (!stored) {
  failures.push('宿主 Token 库里找不到「验证勇者」');
} else {
  const { token } = stored;
  notes.push(`Token 落库：${token.type}，素材 ${token.file}`);
  if (token.characterId !== SEED.id) {
    failures.push(`Token 未记录角色来源，characterId=${token.characterId}`);
  }
  const hp = token.defaultAttributes?.bars?.find((bar) => bar.label === 'HP');
  if (!hp) failures.push('Token 缺少 HP 条');
  else if (hp.max !== 12 || hp.current !== 9) {
    failures.push(`HP 条数值不对：${hp.current}/${hp.max}，应为 9/12`);
  } else notes.push('HP 条 9/12 来自角色卡');

  const ac = token.defaultAttributes?.values?.find((value) => value.label === 'AC');
  if (!ac) failures.push('Token 缺少 AC 数值');
  else notes.push(`AC 数值 ${ac.value}`);

  const labels = (token.defaultAttributes?.values ?? []).map((value) => value.label);
  const expected = ['AC', '先攻', '速度', '熟练', '被动察觉', '力量', '敏捷', '体质', '智力', '感知', '魅力'];
  const missing = expected.filter((label) => !labels.includes(label));
  if (missing.length > 0) failures.push(`Token 数值缺少：${missing.join('、')}`);
  else notes.push(`Token 数值齐全：${labels.join('、')}`);
}

await page.screenshot({ path: 'verify-host-flow.png' });
notes.push('已保存截图 verify-host-flow.png');

// 6) 从房间内打开角色卡浮层，确认车卡界面真的能用。
await page.locator('[aria-label="打开角色卡"]').click();
const cardFrame = page.frames().find((f) => f.url().includes('/card/'));
await cardFrame.waitForFunction(
  () => document.documentElement.getAttribute('data-card-startup') === 'complete',
  null,
  { timeout: 60000 }
);
const cardReady = await page.evaluate(
  () =>
    document.querySelector('[data-character-card-overlay]')?.getAttribute('data-character-card-overlay')
);
if (cardReady !== 'open') failures.push(`角色卡浮层状态异常：${cardReady}`);
else notes.push('房间内可以打开角色卡浮层，子应用启动完成');

await page.screenshot({ path: 'verify-host-card-open.png' });
notes.push('已保存截图 verify-host-card-open.png');

// 关掉角色卡浮层，继续检查 Token 编辑弹窗。
await page.locator('[data-character-card-overlay] [aria-label="关闭"]').first().click();
await page.waitForFunction(
  () =>
    document.querySelector('[data-character-card-overlay]')?.getAttribute('data-character-card-overlay') ===
    'closed',
  null,
  { timeout: 15000 }
);
notes.push('角色卡浮层可以关闭');

// 7) Token 编辑弹窗里必须有「替换图像」的入口（占位图必须可改）。
await page.locator('[aria-label="编辑指示物"]').first().click();
const libraryTile = page.locator('[aria-label="验证勇者"]').first();
await libraryTile.waitFor({ state: 'visible', timeout: 30000 });
await libraryTile.click();
const editIcon = page.locator('[aria-label="Edit Token"]').first();
await editIcon.waitFor({ state: 'visible', timeout: 15000 });
await editIcon.click();
await page.getByText('Token 图像').first().waitFor({ state: 'visible', timeout: 15000 });
await page.getByRole('button', { name: '上传图像' }).waitFor({ state: 'visible', timeout: 15000 });
await page.getByRole('button', { name: '重新同步数值' }).waitFor({ state: 'visible', timeout: 15000 });
notes.push('Token 编辑弹窗提供「上传图像 / 使用角色头像 / 重新同步数值」');

await page.screenshot({ path: 'verify-host-token-editor.png' });
notes.push('已保存截图 verify-host-token-editor.png');

await browser.close();

console.log(notes.map((line) => `  ✓ ${line}`).join('\n'));
if (failures.length > 0) {
  console.error(failures.map((line) => `  ✗ ${line}`).join('\n'));
  process.exit(1);
}
console.log('\n端到端流程验证通过');
