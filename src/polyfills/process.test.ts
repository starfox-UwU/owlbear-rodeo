import { describe, expect, it, vi } from "vitest";

import { createProcessShim, installProcessShim } from "./process";
import type { ProcessShim } from "./process";

describe("installProcessShim", () => {
  it("在缺少 process 的作用域里注入垫片", () => {
    const scope: { process?: ProcessShim } = {};

    expect(installProcessShim(scope)).toBe(true);
    expect(scope.process?.cwd()).toBe("/");
  });

  it("不覆盖已有的 process（Node / jsdom 环境）", () => {
    const existing = createProcessShim();
    const scope: { process?: ProcessShim } = { process: existing };

    expect(installProcessShim(scope)).toBe(false);
    expect(scope.process).toBe(existing);
  });

  it("导入即生效，且在 Node 环境下不会替换真实 process", () => {
    expect(typeof globalThis.process.cwd).toBe("function");
    expect(typeof globalThis.process.versions.node).toBe("string");
  });
});

describe("createProcessShim", () => {
  it("提供 vfile / path-browserify 需要的 cwd()", () => {
    expect(createProcessShim().cwd()).toBe("/");
  });

  it("不会被各依赖误判成 Node 环境", () => {
    const shim = createProcessShim();

    expect(shim.browser).toBe(true);
    expect(shim.versions.node).toBeUndefined();
  });

  it("hrtime() 返回 [秒, 纳秒]，并支持传入上一次结果求差", () => {
    const shim = createProcessShim();
    const start = shim.hrtime();

    expect(start).toHaveLength(2);
    expect(start[0]).toBeGreaterThanOrEqual(0);
    expect(start[1]).toBeGreaterThanOrEqual(0);

    const diff = shim.hrtime(start);
    expect(diff[0]).toBeGreaterThanOrEqual(0);
    expect(diff[1]).toBeGreaterThanOrEqual(0);
    expect(diff[1]).toBeLessThan(1e9);
  });

  it("nextTick() 异步执行回调并透传参数", async () => {
    const shim = createProcessShim();
    const callback = vi.fn();

    shim.nextTick(callback, "a", "b");
    expect(callback).not.toHaveBeenCalled();

    await Promise.resolve();
    expect(callback).toHaveBeenCalledWith("a", "b");
  });

  it("事件相关方法与 stdout/stderr 都是安全的空实现", () => {
    const shim = createProcessShim();

    expect(shim.on("uncaughtException", () => {})).toBe(shim);
    expect(shim.emit("exit")).toBe(false);
    expect(shim.listeners()).toEqual([]);
    expect(shim.stdout.write("x")).toBe(true);
    expect(shim.stderr.write("x")).toBe(true);
  });
});
