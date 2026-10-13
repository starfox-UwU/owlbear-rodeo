import { describe, expect, it } from "vitest";

import { base64ToUint8, uint8ToBase64 } from "./base64";

describe("base64 helpers", () => {
  it("round-trips a byte array", () => {
    const source = new Uint8Array([0, 1, 2, 127, 128, 255]);
    const encoded = uint8ToBase64(source);
    expect(base64ToUint8(encoded)).toEqual(source);
  });

  it("round-trips a buffer larger than the internal chunk size", () => {
    const source = new Uint8Array(0x8000 * 2 + 17);
    for (let index = 0; index < source.length; index += 1) {
      source[index] = index % 251;
    }
    expect(base64ToUint8(uint8ToBase64(source))).toEqual(source);
  });

  it("returns an empty string for empty input", () => {
    expect(uint8ToBase64(new Uint8Array())).toBe("");
    expect(uint8ToBase64(undefined)).toBe("");
  });

  it("accepts ArrayBuffers", () => {
    const buffer = new Uint8Array([104, 105]).buffer;
    expect(uint8ToBase64(buffer)).toBe("aGk=");
  });

  it("returns an empty Uint8Array for empty input", () => {
    expect(base64ToUint8("")).toEqual(new Uint8Array());
  });
});
