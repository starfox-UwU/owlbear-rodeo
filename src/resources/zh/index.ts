import type { Dictionary } from "../en";

/**
 * 简体中文。
 *
 * 用 `satisfies Dictionary` 保证与英文基准完全对齐：
 * 漏译、键名写错、层级对不上都会在 `tsc --noEmit` 时报错。
 */
const zh = {
  /* ------------------------------------------------------------------ *
   * 通用
   * ------------------------------------------------------------------ */
  common: {
    close: "关闭",
    cancel: "取消",
    confirm: "确定",
    ok: "好",
    yes: "是",
    no: "否",
    done: "完成",
    back: "返回",
    next: "下一步",
    delete: "删除",
    remove: "移除",
    edit: "编辑",
    add: "添加",
    save: "保存",
    copy: "复制",
    copied: "已复制",
    reset: "重置",
    noResults: "没有找到结果",
    beta: "测试版",
    new: "新建",
    title: "标题",
    description: "说明",
    size: "大小",
    name: "名称",
    type: "类型",
    more: "更多",
    less: "收起",
    show: "显示",
    hide: "隐藏",
    on: "开",
    off: "关",
  },

  /* ------------------------------------------------------------------ *
   * 首页 / 页脚 / 静态页面外壳
   * ------------------------------------------------------------------ */
  home: {
    title: "Owlbear Rodeo",
    startGame: "创建游戏",
    joinGame: "加入游戏",
    gettingStarted: "新手指引",
    legacyVersion: "旧版 v{{version}}",
  },
  footer: {
    about: "关于",
    home: "首页",
    faq: "常见问题",
    releaseNotes: "更新日志",
    howTo: "使用教程",
  },
  about: {
    title: "关于",
    goalHeading: "项目目标",
    goalBody:
      "Owlbear Rodeo 想做一个打开网页就能开团的工具，不需要其他 VTT 那样繁琐的安装与配置。",
    peopleHeading: "关于作者",
    peopleBody:
      "由两位身处澳大利亚墨尔本的人制作。{{mitch}} 与 {{nicola}} 想找个简单的方式继续他们的 D&D 团——疫情期间线下碰面越来越难。",
    contactHeading: "联系方式",
    contactBody: "如有疑问或建议，请发送邮件至 {{email}}",
  },
  faq: { title: "常见问题" },
  databaseDisabled: {
    message: "{{type}}保存功能当前不可用，详见 {{faq}}。",
    faqLink: "常见问题",
    map: "地图",
    token: "指示物",
  },

  /* ------------------------------------------------------------------ *
   * 语言切换
   * ------------------------------------------------------------------ */
  language: {
    label: "语言",
    system: "跟随系统",
  },

  /* ------------------------------------------------------------------ *
   * 设置弹窗
   * ------------------------------------------------------------------ */
  settings: {
    title: "设置",
    accessibility: "显示与辅助：",
    lightTheme: "浅色主题",
    showFogGuides: "显示战争迷雾辅助线",
    fogEditOpacity: "迷雾编辑不透明度",
    tokenLabelSize: "指示物标签大小",
    gridSnappingSensitivity: "网格吸附灵敏度",
    imageCompression: "图片压缩",
    tokenNotes: "指示物笔记：",
    enableTokenNotes: "启用指示物笔记",
    trigger: "触发方式",
    triggerOnClick: "单击",
    triggerOnDoubleClick: "双击",
    triggerOnLongPress: "长按",
    longPressDuration: "长按时长",
    blur: "背景模糊",
    blurNone: "无",
    blurLow: "低",
    blurHigh: "高",
    fontSize: "字号",
    fontSizeSmall: "小",
    fontSizeMedium: "中",
    fontSizeLarge: "大",
    defaultFont: "默认字体",
    fontSystem: "系统字体",
    fontHandwritten: "手写体",
    fontRunic: "符文",
    defaultPermission: "默认权限",
    permissionWrite: "可编辑",
    permissionReadOnly: "只读",
    permissionHidden: "隐藏",
    clearCache: "清除缓存",
    eraseAll: "清空全部内容并重置",
    importExport: "导入 / 导出数据",
    storageUsed: "已用存储：{{used}} / {{quota}}（{{percent}}%）",
    eraseConfirmTitle: "清空全部内容？",
    eraseConfirmBody: "这会删除所有数据，包括已保存的地图与指示物。",
    eraseConfirmButton: "清空",
  },

  /* ------------------------------------------------------------------ *
   * 对话框 / 弹窗
   * ------------------------------------------------------------------ */
  dialogs: {
    start: {
      password: "游戏密码",
      usePassword: "使用密码",
      submit: "开始",
    },
    join: {
      title: "加入游戏",
      gameId: "游戏 ID",
      gameIdPlaceholder: "输入游戏 ID",
      password: "游戏密码",
      submit: "加入",
      invalidId: "请输入有效的游戏 ID",
    },
    auth: {
      title: "游戏密码",
      submit: "加入",
    },
    confirm: {
      defaultLabel: "确定要继续吗？",
      defaultDescription: "",
      defaultConfirm: "确定",
      defaultCancel: "取消",
    },
    gameExpired: {
      title: "游戏已过期",
      description: "该游戏已经结束，请创建新游戏继续游玩。",
      confirm: "回到首页",
    },
    forceUpdate: {
      title: "需要更新",
      description: "检测到 Owlbear Rodeo 有新版本，刷新页面即可更新。",
      confirm: "刷新",
    },
    maintenance: {
      title: "维护中",
      description: "Owlbear Rodeo 正在维护，请稍后再试。",
    },
    gettingStarted: {
      title: "新手指引",
    },
    groupName: {
      title: "队伍名称",
      placeholder: "输入队伍名称",
    },
    startTimer: {
      title: "计时器",
      hours: "时",
      minutes: "分",
      seconds: "秒",
      start: "开始",
      stop: "暂停",
      reset: "重置",
    },
    addPartyMember: {
      title: "添加队员",
      description: "把另一位玩家加入本局游戏。",
      submit: "添加",
    },
    changeNickname: {
      title: "修改昵称",
      description: "为该玩家输入新的昵称。",
      submit: "修改",
    },
    editMap: {
      title: "编辑地图",
      name: "名称",
      namePlaceholder: "地图名称",
      submit: "保存",
    },
    editToken: {
      title: "编辑指示物",
      name: "名称",
      namePlaceholder: "指示物名称",
    },
    selectData: {
      title: "选择数据",
      all: "全选",
      none: "全不选",
      select: "选择",
      delete: "删除",
    },
    importExport: {
      title: "导入 / 导出数据",
    },
  },

  /* ------------------------------------------------------------------ *
   * 游戏内界面
   * ------------------------------------------------------------------ */
  game: {
    loading: "加载中",
    connecting: "连接中",
    reconnecting: "正在重新连接…",
    offline: "当前离线，修改会先保存在本地。",
    noMap: "没有地图",
    chooseMap: "选择地图",
  },

  /* ------------------------------------------------------------------ *
   * 工具栏 / 工具设置
   * ------------------------------------------------------------------ */
  tools: {
    pointer: "指针",
    fog: "迷雾",
    measure: "测量",
    drawing: "绘图",
    token: "指示物",
    map: "地图",
    dice: "骰子",
    notes: "笔记",
    timer: "计时器",
    wall: "墙体",
    spellTemplate: "法术范围",
    select: "选择",
    settings: "设置",
    undo: "撤销",
    redo: "重做",
    eraseAll: "全部擦除",
    clear: "清空",
  },

  /* ------------------------------------------------------------------ *
   * 指示物 / 地图 / 骰子 / 笔记 / 队伍（后续批次补齐）
   * ------------------------------------------------------------------ */
  tokens: {},
  maps: {},
  dice: {},
  notes: {},
  party: {},
} satisfies Dictionary;

export default zh;
