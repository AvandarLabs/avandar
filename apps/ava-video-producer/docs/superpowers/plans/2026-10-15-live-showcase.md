# Live showcase implementation plan

Goal: Home, Productions, and Atlas show live component animations. MP4s are
created only when a viewer requests a download and are never tracked.

Architecture: preserve the gallery shells and embed an isolated Remotion Player
for each film. A localhost server watches product and renderer source, rebuilds
ignored browser bundles, and refreshes players after successful builds. A shared
film descriptor is the input to both playback and on-demand rendering. Export
jobs validate catalog IDs/options, serialize renders, show progress/failure, use
one Chromium worker, and retain the unchanged frame gate. Outputs live in ignored
`apps/ava-video-producer/out/showcase/`. Source components stay in this worktree.

Constraints: no merge/push. No product backend writes. No secret-file access.
All displayed paths and copied references are relative to the monorepo root.
The existing fixture boundaries, captions, and temporary narration stay explicit.

- [x] Test and implement catalog validation, current storyboard loading, options,
  job serialization, failure handling, and explicit asset serving.
- [x] Build shared FilmComposition and Player iframe with browser controls,
  captions toggle, audio, source refresh, and current-state exports. Watch product
  dependencies, film sources, storyboards, and Atlas renderer/theme inputs.
- [x] Replace homepage/Productions MP4 players, connect Atlas palette downloads,
  and preserve gallery layout, chapters, clip selection, transcripts/captions.
- [x] Remove tracked MP4s, ignore future exports, update delivery commands and
  current docs/checklist. Preserve historical evidence as explicitly historical.
- [x] Verify unit tests/types/lint, all film previews, one full product export,
  one selected-color Atlas export, rebuild after a source edit, errors, mobile,
  and absence of MP4 requests before downloads. Audit visible monorepo paths.

Tests: catalog requests must reject traversal, unknown IDs and invalid colors;
export options must affect shared preview/render inputs; a second distinct export
must not run concurrently; failed jobs never expose a download; serving must not
escape explicit asset roots. Browser checks use the actual UI. Exports must pass
ffprobe metadata and the existing picture gate. New failures get a focused test.
