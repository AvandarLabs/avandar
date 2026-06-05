# 050 — Voice: web Whisper

- **Slug**: `voice-web-whisper`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-050/voice-web-whisper`
- **Depends on**: `none`
- **Estimated PR size**: large — ~10 files + deps, ~1.2k lines.

## Notes for future you

- Web-only Whisper (tiny/base/small). Desktop's larger models (Medium / Large v3 / Large v3 Turbo) land in #051.
- Models cache in IndexedDB (`AvandarVoiceModelCache`) — first download per model is large; subsequent uses are local.
- Floating bottom-left progress indicator is intentional placement (out of the way of the main canvas).

## What this feature is

Microphone button in the chat composer triggers in-browser speech-to-text via `@huggingface/transformers` Whisper (tiny / base / small models). Recording pipeline: `MediaRecorder` → 16 kHz Float32 buffer → Whisper transcribe. Consent modal on first use (mic permission + language picker). IndexedDB-backed `AvandarVoiceModelCache` so models download once. Floating bottom-left progress indicator while a model downloads.

## Steps to migrate

**Step 0** — `/deslop undrift voice-web-whisper`.

1. Create the refactor branch.
2. Add `@huggingface/transformers` (and any related deps).
3. Copy the voice tree + cache + UI.

### Files to copy verbatim

```
src/components/ChatPanel/VoiceInputButton/VoiceInputButton.tsx
src/lib/voice/web/AvandarVoiceModelCache.ts
src/lib/voice/web/webWhisperPipeline.ts
src/lib/voice/web/recordingPipeline.ts
src/components/VoiceModelDownloadIndicator/VoiceModelDownloadIndicator.tsx
src/components/Privacy/VoiceConsentModal/VoiceConsentModal.tsx
```

### Files to surgically edit on `develop`

- The chat composer — mount the `VoiceInputButton`.

### Dependency changes

```
pnpm add @huggingface/transformers
```

## Verification

Manual: mic button → consent modal → record → transcribe → text appears in composer.

## Risks + things to look out for

- **`react-doctor` flags `VoiceInputButton.tsx:149` as a giant component**. The pattern is intentional — porting verbatim is fine; the decomposition is a follow-up.
- **First-load size.** Whisper-tiny is ~40 MB. Document this prominently in the consent modal.

## How to mark this feature completed

Standard ritual.
