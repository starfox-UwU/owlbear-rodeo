/**
 * Reads a Blob/File into a byte array.
 *
 * `Blob.prototype.arrayBuffer()` is available in every browser this app
 * supports, so the old FileReader fallback (which relied on the Node-only
 * `Buffer` global that CRA's webpack config used to polyfill and Vite does not)
 * has been removed.
 *
 * The explicit `Uint8Array<ArrayBuffer>` return type matters: since
 * TypeScript 5.7 typed arrays are generic over their backing buffer, and only
 * an `ArrayBuffer`-backed view is assignable to `BlobPart` / `BufferSource`.
 */
async function blobToBuffer(blob: Blob): Promise<Uint8Array<ArrayBuffer>> {
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export default blobToBuffer;
