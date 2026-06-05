# 053 — Voice: per-file download progress

- **Slug**: `voice-per-file-progress`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-053/voice-per-file-progress`
- **Depends on**: `050-voice-web-whisper`.
- **Estimated PR size**: tiny — ~2 files, ~80 lines.

## Notes for future you

- Whisper models ship as multiple files (config + weights). Pre-fix, the indicator showed aggregate-only progress, which felt frozen for minutes; the per-file progress shows current file + percent.

## What this feature is

Per-file download progress tracking in the voice download indicator. Driver commit: `82fdc1b`.

## Steps to migrate

Surgically edit `VoiceModelDownloadIndicator.tsx` and the download progress reporter in `webWhisperPipeline.ts` to emit per-file events.

## How to mark this feature completed

Standard ritual.
