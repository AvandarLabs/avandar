# 051 — Voice: desktop whisper.cpp

- **Slug**: `voice-desktop-whispercpp`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-051/voice-desktop-whispercpp`
- **Depends on**: `056-desktop-platform-registry`, `050-voice-web-whisper` (the platform factory in #052 dispatches between web and desktop impls).
- **Estimated PR size**: large — bun-side native binding + cache + IPC contracts, ~1.5k lines.

## Notes for future you

- Larger models (Medium, Large v3, Large v3 Turbo) are **desktop-only** by policy — they're too big for browser IndexedDB and too slow for browser CPU. Gate them in the model picker.
- The bun-side `DesktopVoiceModelManager` is polled by the web side via `voice.getStatus` IPC — don't push from bun (the renderer can't subscribe well to bun events from a stable contract).

## What this feature is

Desktop voice path via `smart-whisper` (whisper.cpp via N-API) in the Bun-main process. Model cache on disk under `<userData>/whisper-models/`. IPC contracts (`VoiceContracts.*`). `DesktopVoiceModelManager` polled from the web side via `voice.getStatus`. Medium / Large v3 / Large v3 Turbo gated to desktop only.

## Steps to migrate

**Step 0** — `/deslop undrift voice-desktop-whispercpp`.

1. Confirm #050 + #056 have merged.
2. Create the refactor branch.
3. Add `smart-whisper` dep on the bun side.
4. Copy the bun-side voice tree + IPC contracts.

### Files to copy verbatim

```
bun/voice/DesktopVoiceModelManager.ts
bun/voice/whisperBindings.ts
shared/contracts/VoiceContracts.ts
src/lib/voice/desktop/desktopWhisperPipeline.ts
```

### Files to surgically edit on `develop`

- Bun IPC router — register the voice contracts.
- Renderer voice factory entry — add desktop entry (paired with #052).

### Dependency changes

```
pnpm add smart-whisper  # bun-side
```

## Verification

Desktop build: open chat in Electrobun build, switch to a Large model, transcribe.

## How to mark this feature completed

Standard ritual.
