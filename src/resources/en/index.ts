/**
 * 基准语言：English。
 *
 * 这里定义全部文案键，中文（src/resources/zh/index.ts）必须完整对齐：
 * 少一个键或键名写错都会在 `tsc --noEmit` 时报错。
 *
 * 同时中文文件用 `satisfies typeof en` 约束，所以这里不要写死字面量类型，
 * 否则中文会被要求与英文一字不差。
 */
const en = {
  /* ------------------------------------------------------------------ *
   * 通用
   * ------------------------------------------------------------------ */
  common: {
    close: "Close",
    cancel: "Cancel",
    confirm: "Confirm",
    ok: "OK",
    yes: "Yes",
    no: "No",
    done: "Done",
    back: "Back",
    next: "Next",
    delete: "Delete",
    remove: "Remove",
    edit: "Edit",
    add: "Add",
    save: "Save",
    copy: "Copy",
    copied: "Copied",
    reset: "Reset",
    noResults: "No results",
    beta: "Beta",
    new: "New",
    title: "Title",
    description: "Description",
    size: "Size",
    name: "Name",
    type: "Type",
    more: "More",
    less: "Less",
    show: "Show",
    hide: "Hide",
    on: "On",
    off: "Off",
  },

  /* ------------------------------------------------------------------ *
   * 首页 / 页脚 / 静态页面外壳
   * ------------------------------------------------------------------ */
  home: {
    title: "Owlbear Rodeo",
    startGame: "Start Game",
    joinGame: "Join Game",
    gettingStarted: "Getting Started",
    legacyVersion: "Legacy v{{version}}",
  },
  footer: {
    about: "About",
    home: "Home",
    faq: "FAQ",
    releaseNotes: "Release Notes",
    howTo: "How To",
  },
  about: {
    title: "About",
    goalHeading: "The Goal",
    goalBody:
      "Owlbear Rodeo is an attempt to make a web app to run tabletop encounters without the complicated setup process needed for other VTTs.",
    peopleHeading: "The People",
    peopleBody:
      "Made by two people in Melbourne, Australia. {{mitch}} and {{nicola}} were looking for an easy way to continue their d&d campaign as in-person interaction becomes harder during the COVID-19 crisis.",
    contactHeading: "Contact",
    contactBody: "For questions or feedback email {{email}}",
  },
  faq: { title: "Frequently Asked Questions" },
  databaseDisabled: {
    message: "{{type}} saving is unavailable. See {{faq}} for more information.",
    faqLink: "FAQ",
    map: "Map",
    token: "Token",
  },

  /* ------------------------------------------------------------------ *
   * 语言切换
   * ------------------------------------------------------------------ */
  language: {
    label: "Language",
    system: "System Default",
  },

  /* ------------------------------------------------------------------ *
   * 设置弹窗
   * ------------------------------------------------------------------ */
  settings: {
    title: "Settings",
    accessibility: "Accessibility:",
    lightTheme: "Light Theme",
    showFogGuides: "Show Fog Guides",
    fogEditOpacity: "Fog Edit Opacity",
    tokenLabelSize: "Token Label Size",
    gridSnappingSensitivity: "Grid Snapping Sensitivity",
    imageCompression: "Image Compression",
    tokenNotes: "Token Notes:",
    enableTokenNotes: "Enable Token Notes",
    trigger: "Trigger",
    triggerOnClick: "On Click",
    triggerOnDoubleClick: "On Double Click",
    triggerOnLongPress: "On Long Press",
    longPressDuration: "Long Press Duration",
    blur: "Blur",
    blurNone: "None",
    blurLow: "Low",
    blurHigh: "High",
    fontSize: "Font Size",
    fontSizeSmall: "Small",
    fontSizeMedium: "Medium",
    fontSizeLarge: "Large",
    defaultFont: "Default Font",
    fontSystem: "System",
    fontHandwritten: "Handwritten",
    fontRunic: "Runic",
    defaultPermission: "Default Permission",
    permissionWrite: "Write",
    permissionReadOnly: "Read Only",
    permissionHidden: "Hidden",
    clearCache: "Clear Cache",
    eraseAll: "Erase All Content and Reset",
    importExport: "Import / Export Data",
    storageUsed: "Storage Used: {{used}} of {{quota}} ({{percent}}%)",
    eraseConfirmTitle: "Erase All Content?",
    eraseConfirmBody:
      "This will remove all data including saved maps and tokens.",
    eraseConfirmButton: "Erase",
  },

  /* ------------------------------------------------------------------ *
   * 对话框 / 弹窗
   * ------------------------------------------------------------------ */
  dialogs: {
    start: {
      password: "Game Password",
      usePassword: "Use password",
      submit: "Start",
    },
    join: {
      title: "Join Game",
      gameId: "Game ID",
      gameIdPlaceholder: "Enter a game ID",
      password: "Game Password",
      submit: "Join",
      invalidId: "Enter a valid game ID",
    },
    auth: {
      title: "Game Password",
      submit: "Join",
    },
    confirm: {
      defaultLabel: "Are you sure?",
      defaultDescription: "",
      defaultConfirm: "Confirm",
      defaultCancel: "Cancel",
    },
    gameExpired: {
      title: "Game Expired",
      description:
        "This game has expired. Create a new game to continue playing.",
      confirm: "Home",
    },
    forceUpdate: {
      title: "Update Required",
      description:
        "A new version of Owlbear Rodeo is available. Refresh the page to update.",
      confirm: "Refresh",
    },
    maintenance: {
      title: "Maintenance",
      description:
        "Owlbear Rodeo is currently down for maintenance. Please try again later.",
    },
    gettingStarted: {
      title: "Getting Started",
    },
    groupName: {
      title: "Group Name",
      placeholder: "Enter a group name",
    },
    startTimer: {
      title: "Start Timer",
      hours: "Hours",
      minutes: "Minutes",
      seconds: "Seconds",
      start: "Start",
      stop: "Stop",
      reset: "Reset",
    },
    addPartyMember: {
      title: "Add Party Member",
      description: "Add another player to this game.",
      submit: "Add",
    },
    changeNickname: {
      title: "Change Nickname",
      description: "Enter a new nickname for this player.",
      submit: "Change",
    },
    editMap: {
      title: "Edit Map",
      name: "Name",
      namePlaceholder: "Map name",
      submit: "Save",
    },
    editToken: {
      title: "Edit Token",
      name: "Name",
      namePlaceholder: "Token name",
    },
    selectData: {
      title: "Select Data",
      all: "All",
      none: "None",
      select: "Select",
      delete: "Delete",
    },
    importExport: {
      title: "Import / Export Data",
    },
  },

  /* ------------------------------------------------------------------ *
   * 游戏内界面
   * ------------------------------------------------------------------ */
  game: {
    loading: "Loading",
    connecting: "Connecting",
    reconnecting: "Reconnecting…",
    offline: "You are offline. Changes will be saved locally.",
    noMap: "No Map",
    chooseMap: "Choose Map",
  },

  /* ------------------------------------------------------------------ *
   * 工具栏 / 工具设置
   * ------------------------------------------------------------------ */
  tools: {
    pointer: "Pointer",
    fog: "Fog",
    measure: "Measure",
    drawing: "Drawing",
    token: "Token",
    map: "Map",
    dice: "Dice",
    notes: "Notes",
    timer: "Timer",
    wall: "Wall",
    spellTemplate: "Spell Template",
    select: "Select",
    settings: "Settings",
    undo: "Undo",
    redo: "Redo",
    eraseAll: "Erase All",
    clear: "Clear",
  },

  /* ------------------------------------------------------------------ *
   * 指示物 / 地图 / 骰子 / 笔记 / 队伍
   * ------------------------------------------------------------------ */
  tokens: {},
  maps: {},
  dice: {},
  notes: {},
  party: {},
} as const;

export type Dictionary = DeepString<typeof en>;

/**
 * 把所有叶子节点放宽成 `string`。
 *
 * 基准字典用 `as const` 是为了拿到精确的键名（翻译键的类型安全就靠它），
 * 但键名精确的同时值也变成了字面量，中文会因此无法通过 `satisfies` 校验。
 * 这里只保留结构、放宽值类型。
 */
type DeepString<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends object
    ? DeepString<T[K]>
    : T[K];
};

export default en;
