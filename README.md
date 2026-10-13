# Owlbear Rodeo Legacy

本仓库为 Owlbear Rodeo 旧版本代码，仅供自建与学习使用。
官方团队已将主要精力转向 2.0 版本，本仓库不再维护。

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
STUN_ENABLED=true
STUN_PORT=3478
STUN_BIND_HOST=0.0.0.0
STUN_PUBLIC_HOST=192.168.1.32      # ⭐ 客户端能访问到的地址（裸 IP/域名，不带 http:// 和端口）
```

完整模板见 [`backend/.env.example`](./backend/.env.example)。

- `STUN_PUBLIC_HOST` 必须是客户端可访问的地址，设置后会自动注入 `/iceservers` 返回值。
- 局域网部署请填写宿主机局域网 IP（例如 192.168.1.32）。
- 公网部署需开放 UDP 3478（或你自定义端口）。
- 后端会按 `backend/.env` → `backend/.env.local` 的顺序读取，后者覆盖前者。
  Docker 部署时也可以直接由编排平台注入环境变量（优先级低于 `.env.local`）。

## P2P / 资产传输说明

- 资产传输**优先走 P2P（WebRTC DataChannel）**。
- P2P 失败时，客户端会发送失败信号，主机再上传到后端，异常端从后端拉取。
- ICE 配置通过 `/iceservers` 提供：`backend/ice.json` 提供基础列表，
  `STUN_PUBLIC_HOST` 会被自动前置注入。

### ICE 服务器怎么配

默认的 `backend/ice.json` 是 `{"iceServers": []}`——仓库里不再内置任何机器相关的 IP。

- **同机/局域网使用**：不用配。WebRTC 靠 host candidate 就能直连。
  跨设备传图请设置 `STUN_PUBLIC_HOST=<宿主机局域网IP>`。
- **公网部署**：设置 `STUN_PUBLIC_HOST=<公网域名或IP>` 并放行 UDP `STUN_PORT`。
- **想额外挂公共 STUN**：直接编辑 `backend/ice.json`：

  ```
  {
    "iceServers": [
      { "urls": "stun:stun.example.com:3478" },
      { "urls": "turn:turn.example.com:3478", "username": "u", "credential": "p" }
    ]
  }
  ```

> ⚠️ 历史提交里这个文件曾写着 `stun:192.168.5.14:3478`，那是**原仓库作者局域网**的地址，
> 在别人的网络里根本不可达。如果你是从旧版本升级过来的，请按上面的方式重配。

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

- 请确认 `STUN_PUBLIC_HOST` 可访问，并开放 UDP 端口。
- 确认 `backend/ice.json` 里的 STUN 地址不是别人网络里的历史遗留 IP。
- 确认前端 `VITE_BROKER_URL` 指向正确后端。
- 某些浏览器/扩展会禁用 WebRTC（尤其是隐私/广告拦截类）。

### 升级后前端读不到后端地址

`REACT_APP_BROKER_URL` 已失效，请改用 `VITE_BROKER_URL`。
在 CI/平台上直接注入环境变量时，变量名必须带 `VITE_` 前缀。

### `yarn install` 报 `approvedGitRepositories`

`ammo.js` 依赖 GitHub 上的固定提交。相关白名单写在根目录 `.yarnrc.yml`，
若你 fork 到别处，需要把新的仓库地址加进去。

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
