import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadWhisperCppModelToCache } from "./downloadWhisperCppModel";
import {
  __TEST_ONLY as cacheTestOnly,
  deleteWhisperCppModelFromCache,
  getWhisperCppModelBytes,
} from "./whisperCppModelCache";

describe("downloadWhisperCppModelToCache", () => {
  beforeEach(async () => {
    cacheTestOnly.closeDb();
    await deleteWhisperCppModelFromCache("whisper-tiny");
  });

  afterEach(() => {
    cacheTestOnly.closeDb();
    vi.restoreAllMocks();
  });

  it("streams response body into IndexedDB", async () => {
    const payload = new Uint8Array(8);
    new DataView(payload.buffer).setUint32(0, 0x67676d6c, true);
    payload.set([9, 8, 7, 6], 4);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(payload);
        controller.close();
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(stream, {
          status: 200,
          headers: { "content-length": String(payload.byteLength) },
        });
      }),
    );

    const progress: number[] = [];
    await downloadWhisperCppModelToCache("whisper-tiny", (value) => {
      progress.push(value);
    });

    const cached = await getWhisperCppModelBytes("whisper-tiny");
    expect(cached?.byteLength).toBe(payload.byteLength);
    expect(progress.at(-1)).toBe(100);
  });
});
