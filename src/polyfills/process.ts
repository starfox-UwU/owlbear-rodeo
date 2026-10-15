// 浏览器环境下的最小 `process` 垫片。
//
// CRA 的 webpack 4 会自动注入 Node 的 `process` 全局变量，Vite 不会，而
// react-markdown@4 的依赖链里存在没做 `typeof process` 保护的直接调用，
// 于是渲染 Markdown 时会抛 `ReferenceError: process is not defined`：
//
// - `vfile/core.js` 的构造函数里调用 `process.cwd()`；
// - `path-browserify` 的 `resolve()` 在参数里没有绝对路径时调用 `process.cwd()`；
// - TensorFlow.js 的 Node 平台实现会读取 `process.hrtime()` / `process.versions`。
//
// 这里只补齐这些确实被用到的字段，并且只有在全局不存在 `process` 时才写入，
// 因此 Node / Vitest（jsdom 自带 process）环境的行为完全不受影响。
// `versions` 特意留空：`IS_NODE` 之类的探测依赖 `process.versions.node`，
// 留空才能让各依赖继续按浏览器路径走。

export function createProcessShim() {
  function now() {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  }

  const processShim = {
    browser: true,
    platform: "browser",
    argv: [] as string[],
    version: "",
    versions: {} as Record<string, string>,
    env: { NODE_ENV: import.meta.env?.MODE } as Record<
      string,
      string | undefined
    >,
    cwd: () => "/",
    chdir: () => {},
    nextTick: (
      callback: (...args: unknown[]) => void,
      ...args: unknown[]
    ) => {
      queueMicrotask(() => callback(...args));
    },
    hrtime: (previous?: [number, number]): [number, number] => {
      const elapsed = now();
      const seconds = Math.floor(elapsed / 1000);
      const nanoseconds = Math.round((elapsed % 1000) * 1e6);

      if (!previous) {
        return [seconds, nanoseconds];
      }

      let diffSeconds = seconds - previous[0];
      let diffNanoseconds = nanoseconds - previous[1];

      if (diffNanoseconds < 0) {
        diffSeconds -= 1;
        diffNanoseconds += 1e9;
      }

      return [diffSeconds, diffNanoseconds];
    },
    on: (..._args: unknown[]) => processShim,
    once: (..._args: unknown[]) => processShim,
    off: (..._args: unknown[]) => processShim,
    addListener: (..._args: unknown[]) => processShim,
    removeListener: (..._args: unknown[]) => processShim,
    removeAllListeners: (..._args: unknown[]) => processShim,
    emit: (..._args: unknown[]) => false,
    listeners: (..._args: unknown[]) => [],
    memoryUsage: () => ({ rss: 0, heapTotal: 0, heapUsed: 0, external: 0 }),
    stdout: { write: (..._args: unknown[]) => true },
    stderr: { write: (..._args: unknown[]) => true },
  };

  return processShim;
}

export type ProcessShim = ReturnType<typeof createProcessShim>;

// 只在目标作用域还没有 `process` 时写入，返回是否真的做过注入。
export function installProcessShim(scope: { process?: ProcessShim }) {
  if (scope.process !== undefined) {
    return false;
  }

  scope.process = createProcessShim();

  return true;
}

installProcessShim(globalThis as unknown as { process?: ProcessShim });
