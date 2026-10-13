declare module "pepjs";
declare module "socket.io-msgpack-parser";
declare module "fake-indexeddb";
declare module "fake-indexeddb/lib/FDBKeyRange";
declare module "*.glb" {
  const source: string;
  export default source;
}
declare module "*.bin" {
  const source: string;
  export default source;
}
declare module "*.dds" {
  const source: string;
  export default source;
}
declare module "react-router-hash-link";
declare module "intersection-observer";

/**
 * ammo.js 通过 `?url` 以普通脚本形式加载（原因见 src/helpers/ammo.ts）。
 * 显式声明是为了避免 allowJs 让 TS 去解析那个 1.7MB 的 asm.js 文件。
 */
declare module "ammo.js/builds/ammo.js?url" {
  const url: string;
  export default url;
}
