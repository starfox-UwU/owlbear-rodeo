# 迁移说明：现代 Yarn 4 + Node 24 + Vite

本文档记录本次从 **Node 18 / Yarn 1 (classic) / CRA 4 (react-scripts + webpack 4)** 迁移到
**Node 24 LTS / Yarn 4 (Berry) / Vite 8** 的完整改动、原因与验证结果。

> ⚠️ 本文档是**历史记录**。文中的 `ice.json`、`STUN_*`、`/iceservers`、WebRTC 信令转发
> 等描述反映的是**当时的状态**；这些能力已在后续的
> [第 10 节：服务器中心化改造](#10-服务器中心化改造后续) 中整体移除，当前架构请以
> [README.md](./README.md) 为准。

---

## 1. 迁移前后对照

| 维度 | 迁移前 | 迁移后 |
| --- | --- | --- |
| Node.js | 18.x（`.nvmrc` 18.20.5） | 24 LTS（`.nvmrc` = 24，`engines` ≥ 22.12） |
| 包管理器 | Yarn 1.22 classic（`yarn.lock` v1） | Yarn 4.18.1（`packageManager` + Corepack，`yarn.lock` v4） |
| 依赖布局 | 扁平 `node_modules` | `nodeLinker: node-modules`（仍是真实 `node_modules`） |
| 前端构建 | react-scripts 4 / webpack 4（EOL） | Vite 8 + `@vitejs/plugin-react` |
| 构建提速手段 | `--openssl-legacy-provider` hack | 不再需要 |
| 前端测试 | Jest（CRA 内置） | Vitest 5 + jsdom |
| 类型检查 | react-scripts 构建时附带（`CI=false` 时被忽略） | 独立 `yarn typecheck`（`tsc --noEmit`，当前 0 错误） |
| TypeScript | 4.2 / 4.9 | 5.9 |
| 环境变量前缀 | `REACT_APP_*` | `VITE_*` |
| 构建产物目录 | `build/` | `build/`（保持不变，部署配置无需改路径） |
| Docker 基础镜像 | `node:16.20.2-alpine3.18` | `node:24-alpine` |
| 后端构建产物 | `backend/build/src/**`（与 Dockerfile 不一致） | `backend/build/**`（已统一，并修复 Dockerfile CMD） |

---

## 2. 为什么要换掉 react-scripts

`react-scripts@4` 依赖 webpack 4，webpack 4 使用 `crypto.createHash("md4")`，
在 Node 17+ 上被 OpenSSL 3 移除，因此原来的脚本必须挂 `NODE_OPTIONS=--openssl-legacy-provider` 才能构建。
项目本身早已停止维护，继续把它带进 Node 24 只能靠这个已经不具备长期可用性的开关。
Vite 是当前 React 生态的标准构建工具，构建速度提升明显（本次全量生产构建约 **2.2 秒**）。

---

## 3. 前端代码改动（CRA / webpack 专有语法）

### 3.1 `worker-loader!` → `?worker`

`src/contexts/DatabaseContext.tsx`：

```diff
-//@ts-ignore
-import DatabaseWorker from "worker-loader!../workers/DatabaseWorker";
+import DatabaseWorker from "../workers/DatabaseWorker?worker";
```

`vite.config.ts` 中设置 `worker.format: "es"`，Comlink 的消息通道保持不变。
产出的 worker 独立成 `build/assets/DatabaseWorker-*.js`。

### 3.2 `raw.macro` → `?raw`（Markdown 文档内联）

5 个文件、共 43 处 `raw(...)` 调用改为静态 `import ... from "....md?raw"`：

| 文件 | 调用数 |
| --- | --- |
| `src/routes/ReleaseNotes.tsx` | 23 |
| `src/routes/HowTo.tsx` | 14 |
| `src/routes/FAQ.tsx` | 5 |
| `src/modals/GettingStartedModal.tsx` | 1 |

```diff
-import raw from "raw.macro";
-const overview = raw("../docs/howTo/overview.md");
+import overview from "../docs/howTo/overview.md?raw";
```

### 3.3 环境变量：`REACT_APP_*` → `VITE_*`

Vite 只把 `VITE_` 前缀的变量注入客户端。共修改 8 处代码 + `serviceWorker.ts`：

| 旧变量 | 新写法 |
| --- | --- |
| `process.env.REACT_APP_BROKER_URL` | `import.meta.env.VITE_BROKER_URL` |
| `process.env.REACT_APP_MAINTENANCE` | `import.meta.env.VITE_MAINTENANCE` |
| `process.env.REACT_APP_VERSION` | `__APP_VERSION__`（见下） |
| `process.env.NODE_ENV` | `import.meta.env.PROD` |
| `process.env.PUBLIC_URL` | `import.meta.env.BASE_URL` |

涉及文件：`src/network/Session.ts`、`src/network/useAssetTransfer.ts`、
`src/network/AssetTransport.ts`、`src/routes/Home.tsx`、`src/routes/Game.tsx`、
`src/components/selection/SelectionMenu.tsx`、`src/serviceWorker.ts`。

> **版本号**：旧方案用 `.env` 里的 `REACT_APP_VERSION=$npm_package_version`（依赖包管理器把
> shell 变量展开进 `.env`）。Vite 不会展开 `.env` 里的 `$VAR`，因此改成在
> `vite.config.ts` 中通过 `define` 注入 `__APP_VERSION__`，取值直接来自 `package.json`
> 的 `version`，**只维护一处**。

### 3.4 HTML 模板

`public/index.html` → 根目录 `index.html`，`%PUBLIC_URL%` → `%BASE_URL%`，
并加入 `<script type="module" src="/src/index.tsx">`。
`public/` 下其余文件（favicon、manifest、404.html、thumbnail）由 Vite 原样拷贝到产物根目录。

### 3.5 类型与环境声明

- 删除 `src/react-app-env.d.ts`（`/// <reference types="react-scripts" />`）。
- 新增 `src/vite-env.d.ts`：引入 `vite/client`、`vitest/globals`，声明 `__APP_VERSION__`
  和 `ImportMetaEnv`（`VITE_BROKER_URL` / `VITE_MAINTENANCE` / `VITE_BASE`）。
- `src/global.d.ts` 移除 `*.png` / `*.mp4`（`vite/client` 已内置），保留 `*.glb` / `*.bin`，
  新增 `*.dds`。
- `tsconfig.json` 全面更新：`module: ESNext` + `moduleResolution: bundler`、
  `target: ES2020`、`useDefineForClassFields: false`、`noEmit`，
  `tsBuildInfoFile` 落到 `node_modules/.cache/`。

### 3.6 二进制资源

CRA 通过 webpack 的 file-loader 加载任意未知扩展名；Vite 需要显式声明：

```ts
assetsInclude: ["**/*.glb", "**/*.dds", "**/*.bin"]
```

覆盖 `src/dice/**/*.glb`（骰子模型）、`src/dice/environment.dds`（环境贴图）、
`src/ml/gridSize/group1-shard1of1.bin`（TensorFlow.js 权重）。

### 3.7 Node 内置模块 polyfill（重要）

CRA 的 webpack 4 会自动 polyfill `events` / `path` / `Buffer` 等 Node 内置模块，**Vite 不会**。
浏览器侧代码实际用到了它们：

- `src/contexts/KeyboardContext.tsx`、`src/network/Session.ts` 直接 `import { EventEmitter } from "events"`；
- `src/contexts/MapInteractionContext.tsx` 通过 `tiny-typed-emitter`（内部 `require("events")`）使用；
- `react-markdown@4` 的 `vfile` / `replace-ext` 依赖 `path`。

因此在 `vite.config.ts` 中显式别名（新增 `events`、`path-browserify` 依赖）：

```ts
alias: [
  { find: /^events$/, replacement: "events/events.js" },
  { find: /^path$/, replacement: "path-browserify" },
]
```

> `events/events.js` 写出完整子路径，是因为裸名 `events` 会被 Vite 当成 Node 内置模块外部化，
> 别名不会生效。

`src/helpers/blobToBuffer.ts` 原本有一个 `Buffer.from(...)` 的 FileReader 回退分支，
依赖 CRA 注入的 `Buffer` 全局（Vite 不提供），已简化为纯 `Blob.prototype.arrayBuffer()` 实现。

除了模块别名，还有一类「全局变量」polyfill：CRA 会注入 Node 的 `process` 全局，Vite 不会，
而依赖里有没做 `typeof process` 保护的直接调用 —— 渲染 Markdown 时会抛
`ReferenceError: process is not defined`（`vfile/core.js:47` → `process.cwd()`，
`path-browserify` 的 `resolve()` 同理，TensorFlow.js 的 Node 平台实现还会读 `process.hrtime()`）。
修法是在 `src/polyfills/process.ts` 里提供最小垫片，并保证它在 `src/index.tsx` 的**第一条**
import 位置生效：

```ts
// src/index.tsx
import "./polyfills/process";
```

垫片只在全局确实没有 `process` 时写入（Node / Vitest 不受影响），`versions` 特意留空，
以免各依赖的 `IS_NODE` 探测被误判成 Node 环境。

### 3.8 测试：Jest → Vitest

- 新增 `vitest.config.ts`（`environment: "jsdom"`、`globals: true`、
  `setupFiles: ["./src/setupTests.ts"]`）。
- `src/setupTests.js` → `src/setupTests.ts`，`@testing-library/jest-dom/extend-expect`
  → `@testing-library/jest-dom/vitest`（对应 jest-dom 7）。
- 删除早已失效的 `src/App.test.js`（断言 `/learn react/i` 文案，并不存在），
  新增两个真实用例：`src/helpers/base64.test.ts`、`src/helpers/Vector2.test.ts`（共 15 个用例）。
- `@testing-library/react` 由 `^13.0.0` 降到 `^12.1.5`：RTL 13/14 的 peer 要求 React 18+，
  而本项目仍是 React 17（见「后续建议」）。

### 3.9 TypeScript 5.7+ 类型数组变更

TypeScript 5.7 起 `Uint8Array` 变为对底层缓冲区泛型，`Uint8Array<ArrayBufferLike>`
不再能赋给 `BlobPart` / `BufferSource`。共 6 处编译错误，逐一修正：

- `src/helpers/blobToBuffer.ts`：返回类型明确为 `Uint8Array<ArrayBuffer>`；
- `src/contexts/AssetsContext.tsx`：`normalizeAssetFile` 返回类型收紧；
- `src/upgrade.ts`：改用 `mapBuffer.buffer`；
- `src/network/AssetTransport.ts`：`@msgpack/msgpack` 输出加一处断言（附注释说明原因）。

### 3.10 依赖清单收敛

| 操作 | 包 | 原因 |
| --- | --- | --- |
| 移除 | `react-scripts` | 被 Vite 取代 |
| 移除 | `worker-loader` | 被 `?worker` 取代 |
| 移除 | `raw.macro` | 被 `?raw` 取代 |
| 移除 | `source-map-explorer` | 只认识 webpack 产物；用 `npx vite-bundle-visualizer` 替代 |
| 移除 | `cross-env` | 不再需要注入 `NODE_OPTIONS` |
| 移除 | `@types/jest` | 改用 `vitest/globals` |
| 新增 | `vite`、`@vitejs/plugin-react`、`vitest`、`jsdom` | 新构建/测试链 |
| 新增 | `events`、`path-browserify` | Node 内置模块 polyfill（见 3.7） |
| 新增 | `@tiptap/core` | 原本是 `@tiptap/react` 的 peer，靠传递依赖侥幸存在 |
| 新增 | `@testing-library/dom@^10` | 满足 jest-dom 7 的 peer |
| 移除 | `resolutions: { postcss: 7.0.35, ... }` | 这是给 webpack 4 用的 postcss 7 锁定，会让 Vite 8（postcss 8）崩掉 |
| 新增 | `resolutions: @types/react(-dom) ^17` | 否则 `@types/react-router` 等会各带一份 `@types/react@19`，导致 JSX 类型全崩（TS2786） |

> `ammo.js` 仍固定到 GitHub 提交 `85c0614`。Yarn 4 默认拒绝从任意 git 远程拉代码，
> 需要在 `.yarnrc.yml` 中显式加入 `approvedGitRepositories` 白名单。

### 3.11 ammo.js 与严格模式 —— 骰子失效的根因（本次最隐蔽的坑）

`ammo.js`（Bullet 物理引擎的 Emscripten asm.js 产物）是 **CJS**，它的工厂函数内部有这样一行：

```js
this.Ammo = d;      // d 是真正的 Ammo 命名空间
```

作用是把 Ammo 命名空间挂到**全局对象**上 —— Babylon 的 `AmmoJSPlugin` 默认就从全局 `Ammo` 取它
（此时全局 `Ammo` 已经是命名空间对象而非函数，插件才会走同步初始化分支）。

- **webpack 4（CRA）**：把 CJS 模块包在**非严格**函数里执行，`this` 自动是 `globalThis` → 正常。
- **Vite / rolldown**：把 CJS 内联进 **ES 模块**，而 ES 模块**永远是严格模式**，
  函数内 `this` 是 `undefined` → 直接抛
  `TypeError: Cannot set properties of undefined (setting 'Ammo')`。

用 `new Function` + `"use strict"` 精确复现（脚本已随验证一并清理）：

| 环境 | 写法 | 结果 |
| --- | --- | --- |
| 严格模式（Vite 产物） | `Ammo()` | ❌ `TypeError: Cannot set properties of undefined (setting 'Ammo')` |
| 严格模式 | `Ammo.call(globalThis)` | ❌ 不抛错，但初始化把**主线程永久阻塞**（心跳计时器停止） |
| 非严格模式（webpack / classic script） | `Ammo()` | ✅ 6ms 完成，返回 thenable，`globalThis.Ammo` = 命名空间 |

因此**不能**用 `import`，必须让它在非严格环境下执行。最终方案是新增 `src/helpers/ammo.ts`：
用 `?url` 拿到 ammo.js 的地址，再用 `<script>` 标签按 **classic script** 加载
（脚本自身非严格，`this` 指向 window），完整复现 webpack 时代的执行环境。

实测（真实浏览器，生产构建）：

```
globalAmmoBefore=function | costMs=6 | retType=object | retThen=function
globalAmmoAfter=object | globalEqualsRet=true | hasBtDiscrete=function | VERDICT=OK
```

**顺带修复的两个时序问题**（都源于「`Ammo()` 从同步变成异步」）：

原来 `Ammo()` 同步返回 thenable，其 `then` 会**同步**回调。改成异步加载后 `await`
被推迟到微任务，于是出现两个竞态：

1. **物理引擎晚于 impostor** —— 骰子托盘先收到「场景就绪」并在 `Ammo()` 完成前创建
   `PhysicsImpostor`，报
   `Physics not enabled. Please use scene.enablePhysics(...) before creating impostors.`
2. **骰子模型没被加载** —— `DiceButtons` 有一个**只在挂载时执行一次**的 effect 负责
   加载当前骰子风格，而 `DiceTrayOverlay.handleDiceLoad` 里有这样一段：
   ```ts
   const scene = sceneRef.current;
   if (scene) { await dice.class.load(scene); }   // scene 尚未就绪 → 整个跳过，且不报错
   ```
   一旦把「场景就绪」信号推后，这段只跑一次的初始化就会落进
   「UI 已挂载、但 `sceneRef.current` 仍是 undefined」的窗口里被静默跳过，
   点击骰子时抛 `Dice not loaded, call load before creating an instance`。
   （现象就是：**先切换一次骰子风格才能用** —— 因为切换走的是会 await 加载的
   `handleDiceChange` 路径。）

最终架构把两件事分开，各归其位：

- `DiceInteraction` 的 `onSceneMount(...)` **保持同步**（恢复原语义，消除窗口 2）。
- 物理引擎的启用下沉到真正需要它的地方 —— `DiceTrayOverlay.initializeScene` 里，
  在创建任何 `PhysicsImpostor` **之前** `await enableAmmoPhysics(scene)`（消除窗口 1）。
  `helpers/ammo.ts` 因此导出一个 `enableAmmoPhysics(scene)`，内部会先确保 ammo.js 已加载。

端到端实测（真实浏览器 + 生产构建 + 真实 `DiceTray` / `Dice` 类，
并捕获 Babylon 告警与控制台错误）：

```
[PASS] onSceneMount 同步触发 :: sceneRef 已就绪=true
[PASS] DiceButtons 挂载时加载骰子模型 :: galaxy 已加载
[PASS] DiceTray 建墙时物理引擎已就绪 :: getPhysicsEngine=true
[PASS] 点击 D20 创建实例 :: createInstance + roll 成功
[PASS] 物理 / 骰子加载相关告警 :: 无
```

**附带收益**：ammo.js（1.7 MB）从 JS 产物中分离为独立资源，`DiceTrayOverlay` chunk
由 3.24 MB 降到 1.54 MB，且只在真正打开骰子面板时才请求；生产构建从 1.7s 降到 0.3s。

> 注意：`onSceneMount` 现在要等 ammo.js 脚本加载完（约 2 MB，通常走缓存）才触发，
> 骰子托盘出现会比以前略晚几十到几百毫秒，这是正确性换来的必要代价。

### 3.12 spell template 卡顿：根因与修复

用户反馈的症状非常具体，直接指向绘制层而不是计算层：

> 模板包含的 cell 一多就卡；期间任何画面更新（在 cell 里动鼠标 / 移动镜头 / 缩放）
> 都会 GPU 100%，一个 CPU 核心也几乎吃满，VRAM 呈锯齿状波动。

**根因**：`SpellTemplateGridOverlay` 原来是**每个受影响的格子渲染一个 Konva `<Line>` 节点**：

```tsx
{cells.map((cell) => (
  <Line key={...} points={...} closed fill={...} fillEnabled
        stroke={...} strokeWidth={...} opacity={...} listening={false} />
))}
```

而 Konva 的 `Shape._useBufferCanvas()` 判定条件是「同时有 stroke 和 fill、
且 `fillAfterStrokeEnabled` 为 false」—— 加上默认开启的 `perfectDrawEnabled`，
**每个节点都会被分配一块离屏缓冲画布**来正确合成半透明填充与描边。
模板覆盖几百格就是几百块画布，每帧都要 clear + 重绘 + 合成：

- 绘制调用数随格子数线性爆炸 → **GPU 100% + 一个 CPU 核心吃满**
- 缓冲画布按节点包围盒反复 setSize → 后备存储反复分配 → **VRAM 锯齿波动**

**实测（Konva 8.3.5，400 个格子，每帧整层重绘 60 帧取平均）**：

| 写法 | 平均每帧 | ≈ fps |
| --- | --- | --- |
| 每格一个 `Line` 节点（原写法） | **643.09 ms** | 约 **2** |
| 每格一个 `Line`，但 `perfectDrawEnabled: false` | 0.68 ms | 约 1471 |
| **合并为 1 个 `Shape`（现写法）** | **0.58 ms** | 约 **1734** |

中间那行是关键证据：**仅仅关掉 `perfectDrawEnabled`** 就从 643ms 掉到 0.68ms，
说明瓶颈正是 Konva 的 per-node 缓冲画布合成，与 `polygon-clipping` 等计算无关。

**修复**：把上百个格合并为**一个** `Shape`，用 `sceneFunc` 一次性画出所有格的路径，
一次 `fill`、一次 `stroke`，并显式 `perfectDrawEnabled={false}`、`listening={false}`。
顺带去掉了每帧每格一次的 `convertPointsToNumbers()` 数组分配。

**约 1100 倍提升。**

> 这是一个**与迁移无关的历史扩展性问题**（旧代码同样是每格一个节点），
> 只是模板覆盖格子数够多时才会暴露。

之前逐一排除的怀疑点（保留备查，均有实测）：

| 怀疑点 | 结论 |
| --- | --- |
| `polygon-clipping` 0.15.3 → 0.15.7 版本漂移 | ❌ 非原因。同工作负载 A/B：0.15.7 union 95.7ms / intersection 868.7ms；0.15.3 为 104.3ms / 881.4ms，**基本持平** |
| React 被打成 development 版 | ❌ 非原因。产物含 `Minified React error`，无 `Invalid hook call`、`react-dom.development` 等开发版标记 |
| `konva` / `react-konva` 存在重复副本 | ❌ 无重复（`konva` 固定 8.3.5，且 `browser` 字段正确指向浏览器构建） |
| GLB / DDS / BIN 资源被构建损坏 | ❌ SHA256 与源文件完全一致 |
| `@tensorflow/tfjs` 被塞进首屏 | ❌ 在懒加载 chunk 中，index chunk 不含 tfjs |
| 骰子失效期间泄漏的 WebGL context | 确实存在（`new Engine(...)` 已创建但 `onSceneMount` 从未调用），已随骰子修复消失 |

**同类风险排查**：`src/components/konva/` 下其余 `.map()` 出来的节点（`TokenStatus`、
`TokenAttributeBubble` 等）都是**只有 fill、没有 stroke** 的小图形，
`_useBufferCanvas()` 的首个判断 `if (!this.getStroke()) return false` 直接短路，
不会产生缓冲画布，无需处理。后续若要再加「按数量渲染节点」的覆盖层，请沿用合并路径的写法。

---

## 4. 后端（backend/）改动

### 4.1 构建产物布局修正（修掉一个隐藏 bug）

原 `tsconfig.json` 的 `include: ["./src/**/*", "ice.json"]` 会把 `rootDir` 抬到包根，
产物落在 `build/src/index.js`（`package.json` 的 `start` 也这么写），
但 **Dockerfile 的 `CMD` 却是 `./build/index.js`**，且 `ice.json` 的读取路径在容器里对不上。

现在统一为：

```
rootDir: ./src   →   build/index.js, build/entities/*.js, ...
```

同时把 `scripts/check-esm-relative-imports.mjs` 的扫描目录从 `build/src` 改为 `build`，
并把 `ice.json` 从 `include` 中移除（它是运行时 `fs.readFile` 读取，不需要 tsc 拷贝；
Dockerfile 已经显式 `COPY ice.json`）。`Global.ts` 中 `path.resolve(__dirname, "../../", "ice.json")`
在源码布局与产物布局下都正确指向 `backend/ice.json`。

### 4.2 `.env` 路径修正

```diff
-dotenv.config({ path: path.resolve(__dirname, "../../.env") });
+dotenv.config({ path: path.resolve(__dirname, "../.env") });
```

`backend/src/index.ts` 的 `__dirname` 是 `backend/src`，`../../.env` 实际指向 **仓库根目录**，
与 README 里写的 `backend/.env` 完全不符。改成 `../.env` 后在源码与 `build/` 产物下都正确。
`backend/.env` → `backend/.env.local`（后者覆盖）的读取顺序保持不变。

### 4.3 `dotenv` 从 devDependencies 移到 dependencies

`src/index.ts` 在运行时 `import dotenv`，但原来它被放在 `devDependencies`，
而 Dockerfile 会执行 `yarn install --prod`——生产镜像里根本没有 `dotenv`，一启动就会崩。
已移到 `dependencies`。

### 4.4 Node 24 / ESM

- 移除 `--es-module-specifier-resolution=node`：该参数在 Node 20 已移除，
  且代码中所有相对导入都已带 `.js` 扩展名（由 `yarn check:imports` 守护）。
- `tsconfig.json` 升级为 `module/moduleResolution: NodeNext`、`target/lib: ES2023`、`types: ["node"]`。
- `start:dev` 改用 Node 原生 `node --watch`，不再依赖 `-r dotenv/config`。

### 4.5 依赖升级

| 包 | 前 | 后 | 说明 |
| --- | --- | --- | --- |
| `bcrypt` | ^5.0.0 | ^6.0.0 | v5 无 Node 24 预编译包；v6 支持 |
| `express` | ^4.17.3 | ^4.21.2 | 保持 v4（v5 是破坏性升级） |
| `helmet` | ^5.0.2 | ^8.3.0 | |
| `socket.io` | ^4.5.4 | ^4.8.4 | |
| `dotenv` | ^16（dev） | ^18（prod） | 见 4.3 |
| `typescript` | ^4.9.3 | ^5.9.3 | |
| `@types/node` | ^15.6.1 | ^24.19.2 | |
| `@types/express` | ^4.17.13 | ^4.17.21 | 仍对应 express 4 |

`bcrypt` 有原生构建脚本，Yarn 4 默认禁止依赖执行构建脚本，因此在 `package.json` 中显式放行：

```json
"dependenciesMeta": { "bcrypt": { "built": true } }
```

### 4.6 ESLint

`backend/.eslintrc.json` 声明了 `@typescript-eslint` 插件却没有 `parser`，
ESLint 实际用 espree 解析 TS 文件，`yarn lint` 一直是坏的。本次补齐：

- 新增 `@typescript-eslint/parser` 并设置 `"parser"`；
- 新增 `eslint-import-resolver-typescript` 并配置 `import/resolver.typescript`，
  让 `import/no-unresolved` 能正确把 `./Foo.js` 映射到 `./Foo.ts`（修掉 65 个报错）。

> 剩余 122 个 **airbnb-base 风格报错**（`comma-dangle`、`operator-linebreak`、
> `no-unused-vars` 等）属于迁移前就存在的历史债务——因为 lint 从未真正跑起来过。
> 本次未纳入 CI，也没有为了「跑绿」去关掉规则，建议作为独立任务处理。

---

## 5. 构建与部署配置

| 文件 | 改动 |
| --- | --- |
| `.nvmrc` | `18.20.5` → `24` |
| `.yarnrc.yml`（新增，前端/后端各一份） | `nodeLinker: node-modules`、`enableGlobalCache`、`approvedGitRepositories` |
| `Dockerfile`（前端） | `node:24-alpine`；`apk add git`（git 依赖需要）；`yarn install --immutable`；改为拷贝 `index.html` / `vite.config.ts` / `.yarnrc.yml`；`CMD ["yarn", "dev"]` |
| `backend/Dockerfile` | `node:24-alpine`；builder 阶段装 `python3 make g++` 以应对 bcrypt 无预编译包的情况；跑 `yarn build && yarn check:imports`；`yarn install --immutable --production`；`CMD ["node", "./build/index.js"]` |
| `.dockerignore` | 排除 `build`/`dist`/`coverage` |
| `docker-compose.yml` | `REACT_APP_*` → `VITE_*`（删掉不再需要的 `REACT_APP_VERSION`） |
| `.github/workflows/deploy-pages.yml` | Node 18 → 24；`corepack enable`；`yarn install --immutable`；新增 typecheck 与 test 步骤；去掉 `CI=false`（Vite 不会因告警失败） |
| `vercel.json` | 环境变量改名；`NODE_VERSION: 16.16.0` → `24`；删除 `REACT_APP_VERSION` |
| `render.yaml` | 静态站 `buildCommand` 改为 `corepack enable && yarn install --immutable && yarn build`；`NODE_VERSION: 24`；环境变量改名 |
| `README.md` | 运行环境、命令、环境变量、常见问题全部更新 |

> Yarn 4 的 `--frozen-lockfile` 已更名为 `--immutable`，所有 Dockerfile / CI 均已替换。

---

## 6. 验证结果

全部在本机 Node **v24.21.0** + Yarn **4.18.1** 上实测：

| 验证项 | 命令 | 结果 |
| --- | --- | --- |
| 前端安装 | `yarn install` | ✅ 无 error（仅 React 17 与 react-markdown 的 peer 提示） |
| 后端安装 | `yarn --cwd backend install` | ✅ |
| bcrypt 原生模块 | `require("bcrypt")` 加密/校验往返 | ✅ 在 Node 24 上正常加载 |
| 前端类型检查 | `yarn typecheck` | ✅ **0 error** |
| 前端单元测试 | `yarn test` | ✅ 2 个文件 / 15 个用例全部通过 |
| 前端生产构建 | `yarn build` | ✅ exit code 0，产出 `build/`（示例：主包 2.46 MB，Babylon 骰子块 3.24 MB） |
| 前端 dev server | `yarn dev` | ✅ `/` 返回 200 且注入 Vite client；`/src/index.tsx`、`/manifest.json`、worker 模块均 200 |
| 后端构建 | `yarn build` | ✅ 产出 `build/index.js` |
| 后端 ESM 导入检查 | `yarn check:imports` | ✅ 所有相对导入均带扩展名 |
| 后端启动 | `node build/index.js` | ✅ `GET /health` → 200 `OK`；`GET /iceservers` → 200 并正确读出 `ice.json` |

构建时唯一剩下的告警是 `ammo.js` 里被条件分支保护的 `require("fs")` 被外部化
（`Module "fs" has been externalized for browser compatibility`）。
浏览器环境下 `ENVIRONMENT_IS_NODE` 为 false，该分支不会执行，产物中也已确认没有残留的裸 `fs` 导入。

---

## 7. 需要注意的破坏性变更（给已有部署）

1. **环境变量必须改名**：平台上配置的 `REACT_APP_BROKER_URL`、`REACT_APP_MAINTENANCE`
   需改为 `VITE_BROKER_URL`、`VITE_MAINTENANCE`，否则前端会当成没有后端地址（离线模式）。
   `REACT_APP_VERSION` 已废弃，可以删除。
2. **Node 版本**：CI / 平台 / 服务器上的 Node 需要 ≥ 22.12（建议 24 LTS）。
3. **后端 `.env` 位置**：现在严格读取 `backend/.env` / `backend/.env.local`（与 README 一致）。
   如果之前依赖「把 `.env` 放在仓库根目录被后端读到」的隐藏行为，需要把文件挪到 `backend/`。
4. **`yarn` 命令**：需先 `corepack enable`（Node 24 自带 corepack），
   `--frozen-lockfile` 改成 `--immutable`。
5. **后端 Dockerfile 入口**：由 `build/index.js` 变为**确实存在**的 `build/index.js`
   （之前 CMD 指向的文件其实不存在，容器能跑起来是因为镜像里残留了旧产物）。

---

## 8. 连通性配置修正（迁移后发现的问题）

迁移完成后实测「浏览器连不上后端」，排查后确认**与迁移本身无关**，
而是仓库历史提交里遗留的机器相关配置。已一并处理：

| 问题 | 事实 | 处理 |
| --- | --- | --- |
| 报错里的 `192.168.5.14:9000` | 那是**原仓库作者局域网**的 IP，在本机 `ping` 不通、`tcp` 不通；本机实际网段是 `192.168.1.x` | `.env` 默认值改为 `http://127.0.0.1:9000`（同机开发）；跨设备需改成宿主机局域网 IP |
| `build/` 里仍是旧地址 | `build/assets/index-*.js` 里写着 `http://192.168.5.14:9000`。Vite 的 `VITE_*` 是**构建时**注入的，改 `.env` 不会自动进产物 | 已重新构建；README 中明确「改完 `.env` 必须重启 dev server 或重新 build」 |
| 没有定位手段 | 只能靠肉眼猜「是后端没起、还是地址错、还是端口不通」 | 新增 `scripts/check-broker.mjs`（`yarn check:broker`），依次检查地址来源 → TCP 端口 → socket.io 握手，并给出对应建议 |
| `docker-compose.yml` 里写死 `localhost` | 浏览器解析该地址；从别的设备打开页面时 `localhost` 指向对方自己 | 改为 `${VITE_BROKER_URL:-http://localhost:9000}`，可用根目录 `.env` 覆盖，并加注释说明 |
| `.env` 没有说明 | 使用者不知道哪些值是「浏览器侧」的、改了要不要重新构建 | `.env` 加注释，新增 `.env.example` 与 `backend/.env.example` 模板 |
| `backend/ice.json` 里是 `stun:192.168.5.14:3478` | 同样是原作者的局域网 IP，影响**跨设备 P2P 传图**（不影响 socket.io） | 清空为 `{"iceServers": []}`，改由 `STUN_PUBLIC_HOST` 环境变量驱动 |

实测（`STUN_ENABLED=true`、`STUN_PUBLIC_HOST=192.168.1.32`、`STUN_PORT=3479`）：

```
GET /iceservers -> {"iceServers":[{"urls":"stun:192.168.1.32:3479"}]}
stun server started at 127.0.0.1:3479
```

### 8.1 迁移是否影响了 socket.io？

没有。用与 `src/network/Session.ts` **完全相同**的参数
（`transports: ["websocket"]`、`withCredentials: true`、`socket.io-msgpack-parser`）
对迁移后的后端做实测：

```
✓ TCP 127.0.0.1:9000 端口开放
✓ socket.io 连接成功，socket.id = R50HZ4EPvzTWaLJtAAAA
```

后端监听 `::`（全部网卡），前后端 socket.io 均为 4.8.x，消息解析器一致。

---

## 9. 本次未做 / 后续建议

以下都不属于「yarn + Node 环境迁移」，为控制风险刻意留到后续：

1. **React 17 → 19**。当前仍是 React 17，因此 `@types/react` 被 `resolutions` 锁在 17，
   测试库也只能用 RTL 12。升级涉及 `ReactDOM.createRoot`、`react-konva`、`react-spring`、
   `react-router` v5→v7 等，是独立的一次迁移。
2. **react-markdown 4 → 10**。v4 依赖 `vfile` 老版本，是本次唯一需要 `path` polyfill 的原因。
   改用 v10 后可以去掉 `path-browserify`，但 `renderers`/`source`/`transformImageUri`
   这套 API 全部变了（好在只集中在 `src/components/Markdown.tsx` 一个文件）。
3. **Express 4 → 5**、**ESLint 8 → 9（flat config）**：均为破坏性升级，需要独立验证。
4. **后端 122 个 lint 历史报错**：建议单独一次提交按项目实际风格收敛规则或修复代码。
5. **代码分割**：Babylon.js（3.2 MB）与 TensorFlow.js 目前仍打进主图，
   可考虑用 `manualChunks` / 动态 `import()` 进一步优化首屏体积。

---

## 10. 服务器中心化改造（后续）

目标：把架构从「WebRTC 打洞 + 失败兜底」改成**以服务器为中心**，客户端之间不再直连。

### 10.1 改了什么

| 位置 | 改动 |
| --- | --- |
| `src/network/AssetTransport.ts` | **删除**（RTCPeerConnection / DataChannel / ICE / `/iceservers` 拉取全部移除） |
| `src/network/Session.ts` | 移除 `webrtc_offer` / `webrtc_answer` / `webrtc_ice` 监听；`sendAssetTo` 改为纯服务器中继，返回「是否已交给服务器」 |
| `src/network/NetworkedMapAndTokens.tsx` | 素材流程改为「所有者上传到服务器 → 回传 URL → 请求方 HTTP 下载」，失败时退回 Socket.IO 中继原始字节；请求超时改为 3 次有限重试 |
| `backend/src/services/StunServer.ts` | **删除**（内置 STUN 服务） |
| `backend/src/entities/IceServer.ts`、`controllers/IceServerController.ts`、`ice.json`、`types/stun.d.ts` | **删除**（`/iceservers` 接口与配置） |
| `backend/src/entities/Global.ts` | 不再 `fs.readFile` 读取 `ice.json` |
| `backend/src/entities/GameServer.ts` | 移除 `forwardWebRtcSignal` 及三个 `webrtc_*` 事件转发 |
| `backend/package.json`、根 `package.json` | 移除 `stun` 依赖（`yarn.lock` 同步更新） |
| `backend/Dockerfile` | 不再 `COPY ice.json` |
| `docker-compose.yml`、`backend/.env.example` | 移除 `STUN_PUBLIC_HOST` / `STUN_*` |

### 10.2 关键设计

- **没有打洞**：不存在 `RTCPeerConnection`，也没有任何 UDP 依赖，只要客户端能访问后端即可。
- **服务器保存对局状态**，实时数据（地图 / 指示物 / 指针 / 扩展消息）本来就由 Socket.IO 转发，不受影响。
- **素材两条通道，都在服务器侧**：
  1. `assetRequest` → 所有者 `POST /assets/upload` → `assetResponseUrl` → 请求方 HTTP 下载；
  2. 资源服务不可用 / 上传失败 / 下载失败且判定为网络问题时，改用服务器中继原始字节
     （`assetResponseSuccess`）。消息 id `assetP2pFailed` 相应改名为 `assetUrlFailed`。
- **请求锁与重试**：`requestingAssetsRef` 在等待期间保持锁定，避免同一素材被反复请求；
  `ASSET_REQUEST_TIMEOUT_MS`（8s）× `ASSET_REQUEST_MAX_ATTEMPTS`（3 次）后放弃并提示，
  不再出现进度条永久卡住的情况。

### 10.3 对已有部署的破坏性变更

1. `STUN_ENABLED` / `STUN_PORT` / `STUN_BIND_HOST` / `STUN_PUBLIC_HOST` 全部**失效**，
   可以从平台环境变量里删掉；`backend/ice.json` 已不存在，无需再挂载。
2. 容器**不再需要暴露任何 UDP 端口**，只需 TCP `PORT`（默认 9000）。
3. `ASSET_PUBLIC_URL` 与素材缓存目录变成关键配置：它决定跨设备能否下载到素材。
4. 后端不需要重新挂载 `ice.json`，旧镜像若仍 `COPY ice.json` 会构建失败——请同步更新 Dockerfile。
