import ammoScriptUrl from "ammo.js/builds/ammo.js?url";

import { AmmoJSPlugin } from "@babylonjs/core/Physics/Plugins/ammoJSPlugin";
import { Vector3 } from "@babylonjs/core/Maths/math";
import type { Scene } from "@babylonjs/core/scene";

import "@babylonjs/core/Physics/physicsEngineComponent";

type AmmoNamespace = Record<string, unknown> & {
  then?: (onReady: (value: AmmoNamespace) => void) => void;
};

type AmmoFactory = () => AmmoNamespace;

declare global {
  /**
   * ammo.js 以 classic script 执行时会把自己挂到全局：先是工厂函数，
   * 调用一次之后变成 Ammo 命名空间对象。
   */
  // eslint-disable-next-line no-var
  var Ammo: AmmoFactory | AmmoNamespace | undefined;
}

let factoryPromise: Promise<AmmoFactory> | undefined;

/**
 * 把 ammo.js 作为**普通脚本**加载。
 *
 * 为什么不能 `import` 它：
 * ammo.js 是 Emscripten 的 asm.js 产物，内部依赖「非严格模式下的 this」——
 * 它在工厂函数里执行 `this.Ammo = d` 把命名空间挂到全局。而任何被打包器
 * 内联进 ES 模块的代码都处于严格模式，此时 `this` 是 undefined，结果是
 * 要么直接抛 `TypeError: Cannot set properties of undefined (setting 'Ammo')`，
 * 要么整个初始化过程把主线程卡死（实测两种现象都出现过）。
 *
 * webpack 4（CRA）把 CJS 模块包在非严格函数里执行，所以那个年代没问题。
 * 用 <script> 加载可以完整复现这个执行环境：脚本自身非严格，`this` 指向 window。
 *
 * 同时这样也把 2MB 的 asm.js 从 JS 产物里挪了出来，只在真正用到骰子时才请求。
 */
function loadAmmoFactory(): Promise<AmmoFactory> {
  if (!factoryPromise) {
    factoryPromise = new Promise<AmmoFactory>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = ammoScriptUrl;
      script.async = true;
      script.onload = () => {
        // 此时全局上还是「工厂函数」——只有调用过之后才会被替换成命名空间对象，
        // 所以必须在脚本加载完成的这一刻取走它并缓存。
        const factory = globalThis.Ammo;
        if (typeof factory !== "function") {
          reject(
            new Error(
              `ammo.js 已加载，但 globalThis.Ammo 不是工厂函数（实际是 ${typeof factory}）`
            )
          );
          return;
        }
        resolve(factory);
      };
      script.onerror = () => {
        reject(new Error(`无法加载 ammo.js 脚本：${ammoScriptUrl}`));
      };
      document.head.appendChild(script);
    });
  }

  return factoryPromise;
}

/**
 * 初始化 Ammo（与旧版 `Ammo()` 的调用方式保持一致：可用 `.then()` 等待就绪）。
 *
 * 注意这里**故意**不把 Ammo 命名空间作为 Promise 的解析值返回：
 * 该命名空间自身带 `then`（Emscripten 的就绪钩子），一旦作为 Promise 的值，
 * `await`/`.then` 会把它当成 thenable 递归展开，从而永久挂起（TS1058 也是在
 * 提示这个风险）。命名空间按 ammo.js 的设计挂在 `globalThis.Ammo` 上，
 * Babylon 的 AmmoJSPlugin 默认就从那里取，因此返回 void 即可。
 */
export default async function Ammo(): Promise<void> {
  const factory = await loadAmmoFactory();
  // 工厂来自非严格模式的 classic script，普通调用时 this 即 globalThis，
  // 其内部的 `this.Ammo = ...` 会把命名空间挂到全局。
  factory();
}

/**
 * 在场景上启用 Ammo 物理引擎（会先确保 ammo.js 已加载）。
 *
 * 请在创建任何 `PhysicsImpostor` **之前** await 它，否则 Babylon 会打印
 * `Physics not enabled. Please use scene.enablePhysics(...) before creating impostors.`
 * 并静默跳过该 impostor 的创建。
 *
 * 之所以把这个步骤放在这里而不是骰子组件的副作用里：ammo.js 是运行时异步加载的，
 * 而调用方（骰子托盘）必须保持「场景就绪」信号的同步语义，否则界面会在场景可用
 * 之前挂载，导致只在挂载时执行一次的初始化逻辑（如加载骰子模型）被跳过。
 */
export async function enableAmmoPhysics(
  scene: Scene,
  gravity: Vector3 = new Vector3(0, -98, 0)
): Promise<void> {
  await Ammo();
  if (!scene.getPhysicsEngine()) {
    scene.enablePhysics(gravity, new AmmoJSPlugin(false));
  }
}
