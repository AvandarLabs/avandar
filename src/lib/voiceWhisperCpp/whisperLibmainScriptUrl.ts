/**
 * Absolute URL to the Emscripten glue script for `mainScriptUrlOrBlob`.
 * Pthread builds spawn `em-pthread` workers from this script; without it they
 * use `new URL("", import.meta.url)` and fail with an uncaught Worker error.
 */
export const whisperLibmainUrl = new URL(
  "../../../node_modules/@timur00kh/whisper.wasm/dist/libmain-D9-QM3iM.mjs",
  import.meta.url,
).href;
