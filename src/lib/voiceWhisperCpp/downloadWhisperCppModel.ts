import { assertValidGgmlModelBytes } from "./validateGgmlModelBytes";
import {
  getWhisperCppModelBytes,
  putWhisperCppModelBytes,
} from "./whisperCppModelCache";
import {
  ggmlFileNameForVoiceModelId,
  ggmlUrlForVoiceModelId,
} from "./whisperGgml";
import type { WhisperCppVoiceModelId } from "@/lib/voice/whisperCppVoiceModels";

const YIELD_EVERY_CHUNKS = 8;

function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function concatChunks(
  chunks: readonly Uint8Array[],
  totalLength: number,
): ArrayBuffer {
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged.buffer;
}

/**
 * Streams a ggml file into IndexedDB on the main thread, yielding between read
 * chunks so the UI stays responsive. Does not touch WASM.
 */
export async function downloadWhisperCppModelToCache(
  modelId: WhisperCppVoiceModelId,
  onProgress: (progressPercent: number) => void,
): Promise<void> {
  const existing = await getWhisperCppModelBytes(modelId);
  if (existing && existing.byteLength > 0) {
    onProgress(100);
    return;
  }

  const url = ggmlUrlForVoiceModelId(modelId, "web");
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Voice model download failed: ${response.status} ${response.statusText}`,
    );
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  const body = response.body;
  if (!body) {
    throw new Error("Voice model download returned an empty body");
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  let chunkCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
    received += value.byteLength;
    chunkCount += 1;
    if (contentLength > 0) {
      onProgress(Math.min(99, (received / contentLength) * 100));
    }
    if (chunkCount % YIELD_EVERY_CHUNKS === 0) {
      await yieldToMainThread();
    }
  }

  onProgress(99);
  await yieldToMainThread();

  const fileName = ggmlFileNameForVoiceModelId(modelId, "web");
  const buffer = concatChunks(chunks, received);
  if (buffer.byteLength === 0) {
    throw new Error(`Downloaded ${fileName} is empty`);
  }
  assertValidGgmlModelBytes(buffer, fileName);

  await putWhisperCppModelBytes(modelId, buffer);
  onProgress(100);
}
