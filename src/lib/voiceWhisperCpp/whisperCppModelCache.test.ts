import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __TEST_ONLY,
  deleteWhisperCppModelFromCache,
  getWhisperCppModelBytes,
  hasWhisperCppModelInCache,
  putWhisperCppModelBytes,
} from "./whisperCppModelCache";

describe("whisperCppModelCache", () => {
  beforeEach(async () => {
    __TEST_ONLY.closeDb();
    await deleteWhisperCppModelFromCache("whisper-tiny");
  });

  afterEach(() => {
    __TEST_ONLY.closeDb();
  });

  it("stores and reads ggml bytes by model id", async () => {
    expect(await hasWhisperCppModelInCache("whisper-tiny")).toBe(false);
    const body = new ArrayBuffer(8);
    new DataView(body).setUint32(0, 0x67676d6c, true);
    new Uint8Array(body).set([1, 2, 3, 4], 4);
    await putWhisperCppModelBytes("whisper-tiny", body);
    expect(await hasWhisperCppModelInCache("whisper-tiny")).toBe(true);
    const roundTrip = await getWhisperCppModelBytes("whisper-tiny");
    expect(roundTrip?.byteLength).toBe(8);
    await deleteWhisperCppModelFromCache("whisper-tiny");
    expect(await hasWhisperCppModelInCache("whisper-tiny")).toBe(false);
  });
});
