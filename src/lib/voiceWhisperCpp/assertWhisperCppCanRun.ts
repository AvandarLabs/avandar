/**
 * The bundled whisper.cpp Emscripten build always uses `WebAssembly.Memory` with
 * `shared: true`, which requires a cross-origin isolated page (COOP + COEP).
 */
export function assertWhisperCppCanRun(): void {
  if (typeof crossOriginIsolated !== "boolean") {
    return;
  }
  if (crossOriginIsolated) {
    return;
  }
  throw new Error(
    "Browser dictation needs a cross-origin isolated page (COOP + COEP) because " +
      "the whisper.cpp WASM module uses SharedArrayBuffer. Without those headers " +
      "it fails immediately, often as a generic memory error. Re-enable COOP/COEP " +
      "for voice, or use Avandar Desktop.",
  );
}

export function isWhisperCppCrossOriginIsolated(): boolean {
  return typeof crossOriginIsolated === "boolean" && crossOriginIsolated;
}
