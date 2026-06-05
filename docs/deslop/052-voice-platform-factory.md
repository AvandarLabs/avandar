# 052 — Voice platform factory

- **Slug**: `voice-platform-factory`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-052/voice-platform-factory`
- **Depends on**: `050-voice-web-whisper`, `051-voice-desktop-whispercpp`, `056-desktop-platform-registry`.
- **Estimated PR size**: tiny — 1 factory file, ~80 lines.

## Notes for future you

- Factory returns the right voice backend (web or desktop) so React callers stay platform-agnostic. Don't sprinkle `if (isDesktop)` in components — funnel through this factory.

## What this feature is

`voiceModelManagerFactory.ts` — picks `webWhisperPipeline` (#050) on web, `desktopWhisperPipeline` (#051) on desktop, based on the platform registry from #056.

## Steps to migrate

**Step 0** — `/deslop undrift voice-platform-factory`.

1. Confirm #050, #051, #056 have merged.
2. Copy the factory file.
3. Update `VoiceInputButton` to consume the factory.

### Files to copy verbatim

```
src/lib/voice/voiceModelManagerFactory.ts
```

## How to mark this feature completed

Standard ritual.
