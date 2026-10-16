# Owlbear Rodeo Legacy

本仓库为 Owlbear Rodeo 旧版本代码，仅供自建与学习使用。
官方团队已将主要精力转向 2.0 版本，本仓库不再维护。
不过我这个fork还是会维护的。

## 运行环境

| 项目 | 版本 |
| --- | --- |
| Node.js | 24 LTS（最低 22.12） |
| 包管理器 | Yarn 4（Berry，`nodeLinker: node-modules`） |
| 前端构建 | Vite 8 |
| 前端测试 | Vitest 5 + jsdom |

Yarn 4 通过 [Corepack](https://nodejs.org/api/corepack.html) 自动启用，版本记录在 `package.json` 的
`packageManager` 字段中，无需全局安装：

```
corepack enable      # 一次即可（Node 24 自带 corepack）
```

之后所有 `yarn` 命令都会自动使用 Yarn 4。

> 从旧的 Node 18 / Yarn 1 / CRA 环境升级过来？请看 [MIGRATION.md](./MIGRATION.md)，
> 里面列出了所有破坏性变更（尤其是环境变量改名）与验证结果。

## 部署与运行

### Docker

在项目根目录执行：

```
docker-compose up
```

前端开发服务器跑在 <http://localhost:3000>，后端在 <http://localhost:9000>。
注意：Docker 内存建议 ≥ 5GB。

### 手动部署（生产/轻量服务器）

#### 1) 后端（/backend）

```
corepack yarn --cwd backend install --immutable
```

```
corepack yarn --cwd backend build
```

```
corepack yarn --cwd backend start
```

构建产物为 `backend/build/`，入口是 `backend/build/index.js`。

#### 2) 前端（根目录）

```
yarn install --immutable
```

```
yarn build
```

产物目录仍是 `build/`（与 CRA 时代一致，Docker/CI/Vercel/Render 配置无需改动）。
或者从 pages 分支下载 build 好的文件。

启动轻量生产服务器（二选一）：

```
npx serve -s build -l 3000
```

```
node ./node_modules/serve/bin/serve.js -s build -l 3000
```

> 说明：`serve` 需要手动安装（若缺失）。
> 也可以直接用 `yarn preview`（Vite 内置的静态预览服务器，仅用于本地验证）。

### （可选）前端开发模式

仅用于本地调试：

```
yarn dev          # 等价于 yarn start
```

### 其他常用脚本

| 命令 | 作用 |
| --- | --- |
| `yarn typecheck` | TypeScript 类型检查（`tsc --noEmit`） |
| `yarn check:broker` | **连不上后端时先跑这个**：检查地址来源、TCP 端口、socket.io 握手 |
| `yarn test` | Vitest 单次运行 |
| `yarn test:watch` | Vitest 监听模式 |
| `npx vite-bundle-visualizer` | 查看产物体积构成（替代原 `yarn analyze`） |

## 环境变量

> 迁移提示：Vite 只暴露以 `VITE_` 开头的变量给客户端。
> 旧变量名 `REACT_APP_*` 已全部改名，**已部署的环境需要在平台上同步更新**。

### 前端（根目录 `.env` / `.env.local`）

完整模板见 [`.env.example`](./.env.example)。

| 变量 | 说明 |
| --- | --- |
| `VITE_BROKER_URL` | **浏览器**去连后端的地址，如 `http://127.0.0.1:9000` |
| `VITE_MAINTENANCE` | `"true"` 进入维护/离线模式 |
| `VITE_BASE` | 可选，部署在子路径时的 base，默认 `/` |

> ⚠️ `VITE_BROKER_URL` 是给**浏览器**用的，不是给 Node 进程用的。
> `127.0.0.1` / `localhost` 只在「浏览器和后端跑在同一台机器」时才成立；
> 从手机或另一台电脑打开页面，必须写成宿主机的局域网 IP。
>
> ⚠️ 这个值在**构建时**被写死进产物。改完 `.env` 后：
> 开发模式重启 `yarn dev`，生产产物必须重新 `yarn build`。

> 版本号不再由 `REACT_APP_VERSION` 提供：构建时从 `package.json` 的 `version`
> 通过 `define` 注入为 `__APP_VERSION__`，只改 `package.json` 一处即可。

### 后端（`backend/.env` 或 `backend/.env.local`）

```
PORT=9000
ASSET_PUBLIC_URL=http://192.168.1.32:9000   # 可选：素材下载的对外前缀
```

完整模板见 [`backend/.env.example`](./backend/.env.example)。

- 后端是**纯服务器中心**的：实时消息与素材都经由它转发 / 存储，
  不再需要 STUN / TURN，也不需要放行任何 UDP 端口。
- `ASSET_PUBLIC_URL` 是素材上传后返回给浏览器的下载前缀。
  留空时按请求头里的 `Host` 自动推导，一般只在跨网络部署时才需要显式指定。
- 素材落盘目录与过期时间由 `ASSET_CACHE_DIR` / `ASSET_CACHE_TTL_MS` /
  `ASSET_CACHE_POST_GAME_TTL_MS` 控制。
- 后端会按 `backend/.env` → `backend/.env.local` 的顺序读取，后者覆盖前者。
  Docker 部署时也可以直接由编排平台注入环境变量（优先级低于 `.env.local`）。

## 多语言（简体中文 / English）

界面文案已全部接入自研的轻量 i18n 内核（`src/i18n`），**支持运行时切换语言**。

### 语言入口

| 位置 | 说明 |
| --- | --- |
| 设置（右上角齿轮）→ 语言 | 完整选项：跟随系统 / 简体中文 / English |
| 页脚 | 中英两态快捷切换 |

- 首次访问默认**跟随浏览器语言**：`zh-*` 显示中文，`en-*` 显示英文，其他语言回退中文。
- 选择结果写入 `localStorage`（settings 的 `language` 字段，v18 起），刷新后保持。
- 切换语言不需要刷新页面。

### 新增文案

1. 在 `src/resources/en/index.ts` 里加英文键（这是**基准**）。
2. 在 `src/resources/zh/index.ts` 里加同名中文键。

中文文件用 `satisfies Dictionary` 约束，**漏译、键名写错、层级不一致都会让 `yarn typecheck` 直接报错**，
所以只要类型检查通过，就不存在漏翻的键。

```tsx
import { useI18n } from "../i18n";

function Example() {
  const { t } = useI18n();
  return <Button>{t("common.save")}</Button>;
}
```

- 插值用 `{{name}}`：`t("settings.storageUsed", { used: "1 MB" })`。
- 非 React 上下文（helper / class / 网络层）用 `translate(language, key, values)`，
  语言由调用方传入或从 settings 读取，**不要在非组件里调用 hook**。
- 约定：界面里不要再出现写死的展示文案。纯函数（例如表达式解析器）应返回
  **稳定错误码**，由组件层翻译，避免把某一种语言写进业务逻辑。
- ⚠️ **react-konva 是另一棵 React 渲染树**：`<Stage>` 里的组件**不会**继承主应用的
  context，会报 `useXxx must be used within a XxxProvider`。凡是 Konva 子树要用到的
  context，都必须在 [`KonvaBridge.tsx`](./src/helpers/KonvaBridge.tsx) 里再转发一次
  （`I18nContext` 也在其中）。`src/helpers/konvaContextBridge.test.ts` 会扫描所有
  Konva 渲染的组件并逐个校验，漏转发会直接测试失败。

### 术语对照

地图 map、指示物 token、战争迷雾 fog of war、骰子 dice、网格 grid、
测量 measure、绘图 drawing、主持人 GM、队伍 party、图层 layer、素材 asset。

## 服务器中心架构与资产传输

本项目是**以服务器为中心**的：客户端之间**不再建立 WebRTC 直连（打洞）**，
也不需要 STUN / TURN。

- **实时状态**（地图、指示物、指针、扩展消息）：客户端只连后端的 Socket.IO，
  由服务器转发并保存对局状态；中途加入的玩家可以直接拿到当前状态。
- **素材传输**：
  1. 请求方通过 Socket.IO 请素材所有者把素材发布到服务器；
  2. 所有者 `POST /assets/upload` 上传到后端，把下载 URL 回传；
  3. 请求方用普通 HTTP 从后端下载并写入本地缓存。
  4. 服务器没有可用资源服务（`VITE_BROKER_URL` 缺失）或上传失败时，
     会退回 **Socket.IO 中继原始字节**，保证对局仍能继续。
- **已经移除的东西**：`backend/ice.json`、`/iceservers` 接口、内置 STUN 服务、
  `STUN_*` 环境变量，以及 `webrtc_offer` / `webrtc_answer` / `webrtc_ice` 信令转发。

因此「别人能不能看到你的图」只取决于一件事：**所有客户端都能访问到同一个后端**。
不需要放行 UDP 端口，也不要求浏览器支持 WebRTC（隐私扩展禁用 WebRTC 也不影响）。

## 常见问题

### 浏览器报「无法建立到 ws://.../socket.io/ 服务器的连接」

这条报错说明 **WebSocket 连接根本没建立起来**（连不上或端口不通），
不是代码问题。先跑一条命令定位：

```
yarn check:broker
```

它会告诉你前端正在连哪个地址、这个值是从哪来的、TCP 通不通、socket.io 握手成不成功。
常见原因按概率排序：

1. **后端没启动**。`cd backend && yarn build && yarn start`。
2. **地址写成了别人的 IP**。本仓库历史提交里的默认值是原作者局域网的
   `192.168.5.14`（早已不可达）。请改成 `http://127.0.0.1:9000`（同机）
   或 `http://<你的局域网IP>:9000`（跨设备）。
3. **改了 `.env` 但没重新构建/重启**。这个地址是构建时写死进 bundle 的：
   开发模式重启 `yarn dev`，生产产物重新 `yarn build`，浏览器再硬刷新（Ctrl+Shift+R）。
   直接打开旧的 `build/` 目录就会一直用旧地址。
4. **从别的设备访问，但地址是 `localhost`**。`localhost` 在对方设备上指向对方自己，
   必须写宿主机的局域网 IP。
5. **防火墙**没放行 9000 端口。

### 自定义图片在其他设备不可见

现在所有素材都经服务器中转，按顺序检查：

1. 前端 `VITE_BROKER_URL` 指向的后端地址，**其他设备也能访问**（不要写 `localhost`）。
2. 后端 `ASSET_PUBLIC_URL`（或它自动推导出的地址）对其他设备可达。
3. 后端进程对素材缓存目录可写（`ASSET_CACHE_DIR`，默认 `cache/assets`）。
4. 素材所有者在传输期间保持在线——素材是他浏览器里的本地文件上传的。

不再需要 STUN/TURN，也不再要求浏览器支持 WebRTC。

### 升级后前端读不到后端地址

`REACT_APP_BROKER_URL` 已失效，请改用 `VITE_BROKER_URL`。
在 CI/平台上直接注入环境变量时，变量名必须带 `VITE_` 前缀。

### `yarn install` 报 `approvedGitRepositories`

`ammo.js` 依赖 GitHub 上的固定提交。相关白名单写在根目录 `.yarnrc.yml`，
若你 fork 到别处，需要把新的仓库地址加进去。

### 控制台报 `ReferenceError: process is not defined`

从 CRA 迁到 Vite 后，Node 的 `process` 全局不再自动注入，`react-markdown@4` 依赖链
（`vfile` / `path-browserify`）在渲染 Markdown 时会用到它。仓库已在
`src/polyfills/process.ts` 提供最小垫片并置于 `src/index.tsx` 首行 import。

如果你仍看到这个报错，说明浏览器跑的是**旧的构建产物**：删掉 `build/` 重新
`yarn build`（开发模式重启 `yarn dev`），再硬刷新页面即可。

## 引用

[byronknoll/visibility-polygon-js: This library can be used to construct a visibility polygon for a set of line segments.](https://github.com/byronknoll/visibility-polygon-js) **高效的多边形光照算法**

## License
本项目仅供个人使用，不提供商业授权。
未经许可，不得进行商业目的的修改、发布或传播。
如需商业授权，请联系官方：contact@owlbear.rodeo

## Contributing
~~该仓库为历史版本，已关闭 PR。~~
我接手了

## Credits
项目由 Nicola 与 Mitch 创建。
