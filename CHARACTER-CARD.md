# 角色卡集成（DND Card Web ⇄ Owlbear Rodeo Legacy）

本文说明 [DND-card-web](https://github.com/FullPeople/DND-card-web) 是如何并入本项目的、
两个应用之间怎么通信、以及如何验证。

---

## 1. 为什么要做成子应用

| | 本项目（宿主 VTT） | 角色卡（DND-card-web） |
| --- | --- | --- |
| React | 17 | 19 |
| 构建 | Vite 8（`build/`） | Vite 8（`dist-standalone/`） |
| 职责 | 地图、Token、骰子、联机 | 车卡、规则资料、Wiki、备份 |

两者 React 大版本不兼容，直接把角色卡的 `src/` 拖进宿主的 `src/` 会在
`react-dom/client`、Hooks 语义、类型定义上全面冲突。因此：

- 角色卡源码原样放在 **`character-card/`**（保留它自己的 `package.json`、测试、文档）；
- 构建产物输出到宿主 **`public/card/`**，由宿主静态托管；
- 宿主用 **同源 iframe** 承载它，用 **`postMessage`** 读写角色数据。

这样车卡 UI（约 6400 行 TSX + 3500 行 CSS）一行都不用重写，升级上游也只需重新构建。

> 数据全部留在浏览器里：角色卡使用自己的 IndexedDB（单机版为 `dnd-card-standalone`），
> 宿主的游戏数据库是 `OwlbearRodeoDB`，两者互不覆盖。

---

## 2. 目录与构建

```
character-card/            角色卡子应用（React 19）
  src/platform/hostBridge.ts    ← 新增：宿主桥接，挂在 window.__DND_CARD_BRIDGE__
  tools/verifyHostEmbed.mjs     ← 新增：桥接协议验证
  tools/verifyHostFlow.mjs      ← 新增：端到端「生成 Token」验证
public/card/               构建产物（已 gitignore，由脚本生成）
scripts/build-card.mjs     构建 + 拷贝，带「无变化则跳过」
src/character/             宿主侧集成代码
```

命令：

```sh
yarn card:build     # 强制重建（首次会自动 npm ci character-card）
yarn dev            # predev 钩子：有变化才重建，失败只告警
yarn build          # prebuild 钩子：构建失败会中断
```

`public/card/` 与 `character-card/node_modules/` 都在 `.gitignore` 里，
克隆后第一次 `yarn dev` 会自动把子应用构建出来。

---

## 3. 宿主侧代码

| 文件 | 作用 |
| --- | --- |
| `src/character/types.ts` | 两侧共享的摘要数据结构（只有类型，不引入子应用代码） |
| `src/character/bridge.ts` | `postMessage` 客户端 + `useCharacterCard` 数据源 |
| `src/character/CharacterCardContext.tsx` | 全局唯一的 iframe 与浮层，按需加载、常驻不重载 |
| `src/character/characterToken.ts` | 摘要 → Token 属性/占位图/素材 |
| `src/character/CreateTokensFromCardModal.tsx` | 多选角色批量生成 Token + 导入角色文件 |
| `src/character/CharacterTokenButtons.tsx` | 房间 Token 栏上的两个入口按钮 |
| `src/components/token/TokenImageEditor.tsx` | Token 图像替换、头像/数值重新同步 |
| `src/routes/CharacterCard.tsx` | `/card` 路由入口 |

`src/types/Token.ts` 增加了一个可选字段 `characterId`：只有由角色卡生成的 Token 才有，
用于「重新同步」。手动创建的 Token 不受影响。

---

## 4. 消息协议

同源，`targetOrigin` 固定为 `window.location.origin`，消息体统一带 `__dndCardBridge: true`。

```ts
{ __dndCardBridge: true, kind: "request",  id, method, params }
{ __dndCardBridge: true, kind: "response", id, ok, result | error }
{ __dndCardBridge: true, kind: "event",    event, data }
```

方法：

| method | 说明 |
| --- | --- |
| `ping` | 握手，返回协议版本 |
| `list` | 角色**摘要**列表（不含头像，轻量） |
| `summary` `{ id }` | 单个角色摘要，**含头像 data URL** |
| `full` `{ ids }` | 完整 `exportLinkedOwlbear` 快照（备份用，按需调用） |
| `importPayloads` `{ payloads }` | 把角色 JSON 合并写回角色卡工作区 |
| `setActive` `{ id }` | 切换角色卡里选中的角色 |

事件：`ready`（子应用就绪）、`workspace-changed`（角色卡自己保存了）。

**为什么摘要要单独做一层**：一个角色的 `selections` 里带着完整规则条目，
而规则资料有上万条。列表同步只传
`abilities / ac / hp / skills / weapons / resources / …`
这几个游玩真正要用的数值，避免大对象穿过 `postMessage` 造成卡顿；
头像和完整快照都只在明确需要时按需拉取。

---

## 5. 数值映射

`summaryToAttributes()`（`src/character/characterToken.ts`）：

- **条**：`HP`（当前 / 上限）、临时 HP > 0 时追加 `临时HP`；
- **数值**：`AC`、`先攻`、`速度`、`熟练`、`被动察觉`、`法术DC`、`法术攻击`、
  `力量`…`魅力`（调整值）、`生命骰`、`激励`。

映射落在 Token 的 `defaultAttributes` 上，放置到地图时会克隆到 TokenState，
因此游玩时点开 Token 就能用现有的属性编辑器改，改动会正常同步给其他玩家。

**图像**：角色卡有头像就用头像；没有就用「名字首字 + 稳定配色」的圆形占位图。
两种情况都是普通素材，可以在 Token 编辑弹窗里随时上传替换。

---

## 6. 验证

前置：`yarn dev`（默认 5199，或任意端口）与 broker（9000）已启动。

```sh
# 协议层：/card 能加载子应用，list / summary 返回真实数据
node character-card/tools/verifyHostEmbed.mjs http://127.0.0.1:5199

# 端到端：房间内多选角色 → 生成 Token → 落库数值正确 → 房间内能打开角色卡
node character-card/tools/verifyHostFlow.mjs http://127.0.0.1:5199
```

`verifyHostFlow.mjs` 会直接检查宿主 `OwlbearRodeoDB` 里的 Token：
`characterId`、`HP 9/12`、`AC`、以及一整套数值标签是否齐全。

宿主侧还有 Vitest 单测覆盖数值映射：

```sh
yarn test src/character
```

---

## 7. 已知边界

- **上游 release-automation 测试需要大体积证据文件**：合并时没有带进来
  `character-card/docs/data/automation-rule-status.json`（10 MB）与
  `automation-runtime-coverage.json`（4 MB）——那是上游发布流水线的规则审计快照，
  不是运行时数据。因此 `character-card` 里这三个文件会失败：
  `tests/automationProgress.test.ts`、`tests/automationRuleProvenance.test.ts`、
  `tests/automationRuleSnapshot.test.ts`。
  其余 **174 个文件 / 1499 个用例全部通过**。
  构建只需要 `docs/data/automation-progress.json`（13 KB，已保留）。
- 角色卡浮层是全屏的：它本身是 A4 纸张布局，嵌在小面板里不可用。
  关闭只是隐藏，iframe 常驻，所以来回切换不会重新加载。
- 首次加载子应用时会显示角色卡自己的「公告」弹窗（可勾选不再弹出）。
- 修改角色卡的数值**不会**自动回写到已经放在地图上的 Token——
  需要在 Token 编辑弹窗里点「重新同步数值」，避免把玩家的临场改动冲掉。
- iframe 不设置 `allow="clipboard-*"`：Chrome 不认这两个 feature 名，会打出
  `Permissions Policy: Skipping unsupported feature name`。同源 iframe 本来就继承
  剪贴板权限，去掉反而干净。
- `character-card/` 保留上游的 [非商用共享许可](./character-card/LICENSE)，
  与本项目其余部分的许可是分开的。
