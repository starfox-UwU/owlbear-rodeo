/**
 * 验证「角色卡被自建 VTT 宿主嵌入」这条链路：
 *  1. 宿主 /card 页面能加载子应用 iframe；
 *  2. 子应用挂载了 window.__DND_CARD_BRIDGE__；
 *  3. postMessage 协议（list / summary）能返回真实角色摘要。
 *
 * 用法：先用宿主项目启动 dev server（默认 http://127.0.0.1:5199），再运行
 *   node tools/verifyHostEmbed.mjs [hostUrl]
 */
import { chromium } from '@playwright/test';

const hostUrl = process.argv[2] || 'http://127.0.0.1:5199';
const target = new URL('card', hostUrl).toString();

const SEED = {
  schemaVersion: 1,
  id: 'verify-character-1',
  revision: 1,
  name: '验证勇者',
  player: 'Tester',
  edition: '2024',
  createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
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
const consoleErrors = [];

page.on('pageerror', (error) => failures.push(`host pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 200));
});

await page.goto(target, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('iframe', { timeout: 20000 });
notes.push('宿主 /card 渲染出 iframe');

const cardFrame = page.frames().find((frame) => frame.url().includes('/card/'));
if (!cardFrame) throw new Error('找不到角色卡 iframe');
await cardFrame.waitForFunction(() => !!window.__DND_CARD_BRIDGE__, null, { timeout: 30000 });
notes.push('子应用挂载了 window.__DND_CARD_BRIDGE__');

// 直接写入子应用的工作区，模拟「玩家已经车好卡」。
await cardFrame.evaluate(async (character) => {
  const request = indexedDB.open('dnd-card-standalone', 1);
  const db = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const workspace = {
    schemaVersion: 1,
    characters: [character],
    activeId: character.id,
    packs: [],
  };
  await new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite');
    tx.objectStore('documents').put(workspace, 'workspace');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}, SEED);
notes.push('已写入 1 个测试角色');

/** 通过真实 postMessage 路径调用桥接，而不是直接读 window 对象。 */
async function hostRequest(method, params) {
  return page.evaluate(
    ({ method, params }) =>
      new Promise((resolve, reject) => {
        const iframe = document.querySelector('iframe');
        if (!iframe?.contentWindow) {
          reject(new Error('no iframe'));
          return;
        }
        const id = Math.floor(Math.random() * 100000);
        const timer = setTimeout(() => {
          window.removeEventListener('message', onMessage);
          reject(new Error('timeout'));
        }, 15000);
        function onMessage(event) {
          const data = event.data;
          if (!data || data.__dndCardBridge !== true) return;
          if (data.kind !== 'response' || data.id !== id) return;
          clearTimeout(timer);
          window.removeEventListener('message', onMessage);
          if (data.ok) resolve(data.result);
          else reject(new Error(data.error));
        }
        window.addEventListener('message', onMessage);
        iframe.contentWindow.postMessage(
          { __dndCardBridge: true, kind: 'request', id, method, params },
          location.origin
        );
      }),
    { method, params }
  );
}

const list = await hostRequest('list', undefined);
if (!Array.isArray(list) || list.length !== 1) {
  failures.push(`list 返回异常：${JSON.stringify(list)?.slice(0, 200)}`);
} else {
  notes.push(`list 返回 ${list.length} 个角色：${list[0].name}`);
}

const summary = await hostRequest('summary', { id: SEED.id });
if (!summary || summary.name !== SEED.name) {
  failures.push(`summary 返回异常：${JSON.stringify(summary)?.slice(0, 200)}`);
} else {
  const ability = summary.abilities.find((item) => item.key === 'str');
  notes.push(
    `summary: 等级 ${summary.level} HP ${summary.hp.current}/${summary.hp.max} AC ${summary.ac} 力量调整 ${ability?.modifier}`
  );
  if (summary.hp.max <= 0) failures.push('HP 上限没有算出来');
  if (!ability || ability.modifier !== 3) {
    failures.push(`力量调整值应为 3，实际 ${ability?.modifier}`);
  }
}

// 角色卡子应用自带的上游逻辑可能产生噪音，这里只把「权限策略」类警告暴露出来，
// 因为那是宿主 iframe 配置的问题（例如 allow="clipboard-read"）。
const policyErrors = consoleErrors.filter((text) => /Permissions Policy/i.test(text));
if (policyErrors.length > 0) {
  failures.push(`宿主 iframe 触发了权限策略警告：${policyErrors.join(' | ')}`);
} else {
  notes.push('宿主 iframe 没有权限策略警告');
}

await page.screenshot({ path: 'verify-host-embed.png' });
notes.push('已保存截图 verify-host-embed.png');

await browser.close();

console.log(notes.map((line) => `  ✓ ${line}`).join('\n'));
if (failures.length > 0) {
  console.error(failures.map((line) => `  ✗ ${line}`).join('\n'));
  process.exit(1);
}
console.log('\n宿主嵌入验证通过');
