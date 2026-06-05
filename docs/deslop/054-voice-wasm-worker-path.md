# 054 — Voice: WASM Worker path

- **Slug**: `voice-wasm-worker-path`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-054/voice-wasm-worker-path`
- **Depends on**: `050-voice-web-whisper`.
- **Estimated PR size**: medium — Web Worker entry + path bridge, ~300 lines.

## Notes for future you

- This is a **parallel pipeline** to the `@huggingface/transformers`-based one in #050. It runs whisper.cpp WASM in a dedicated Web Worker for better isolation from the main thread.
- Don't remove #050 — both paths coexist. The factory in #052 may pick one or the other based on hardware / model.

## What this feature is

A whisper.cpp WASM voice pipeline running inside a Web Worker. Alternative to the `transformers`-based pipeline in #050; better isolation from the main thread for long transcriptions. Driver commit: `ef5bd0a`.

## Steps to migrate

**Step 0** — `/deslop undrift voice-wasm-worker-path`.

1. Confirm #050 has merged.
2. Copy the worker + bridge.

### Files to copy verbatim

```
src/workers/voiceWasm.worker.ts
src/lib/voice/web/wasmWorkerPipeline.ts
```

## How to mark this feature completed

Standard ritual.
