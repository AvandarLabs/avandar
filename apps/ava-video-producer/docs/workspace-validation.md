# Workspace migration validation

Completed locally on 2026-10-15 on `feat/video-producer`, based on Avandar
revision `3c164aa32b8a60b30885081e7bb0986135e99f70`. The imported toolkit came from
`avandar-video-agent` revision `16ba4df`. No backend capture, deployment, merge,
push, or repository deletion was part of this validation.

## Source and private project boundaries

- The component bridge compiled 665 files directly from the enclosing Avandar
  worktree. No vendored product source or nested clone is included.
- A temporary product theme change was observed in the live review browser after
  automatic rebuild/reload. The original source was restored byte-for-byte and
  verified with Git. A subsequent adapter rebuild also reloaded the browser and
  retained the complete source manifest. The default brand remained `#1563fe`.
- Rebuilding unchanged inputs produces identical JavaScript and CSS. A regression
  test covers this because preview and render both rebuild the current source.
- A new private project under `.videos/migration-check/` completed plan, preview,
  and render commands, keeping its assets and outputs inside that project.
  Nested derived plans and symlink rejection have automated coverage.
- Git ignores `.videos/`, component build outputs, preview/render output, and
  generated theme data. The staged app contains no credentials, raw capture
  sessions, or vendored component tree. A credential-pattern scan found only an
  explicitly artificial JWT used by the capture sanitizer test.
- Internal planning notes were preserved in ignored
  `.videos/migration-archive/docs/`. They must survive later worktree cleanup.

## Completed checks

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Passed. Existing workspace direct dependency versions remained unchanged; the lockfile adds producer dependencies and resolves optional peer contexts. |
| Producer `typecheck` | Passed for source and tool/test TypeScript projects. |
| Producer `test` | 65 passed, 0 failed. Includes source parity, stale-build rejection, reproducible builds, private workspace boundaries, storyboards, capture guards, and media assembly. |
| Workspace ESLint for the app and its configuration | 0 errors, 0 warnings. |
| `data:validate` | 240 cases, 297 visits, 12 facilities, 6 districts, and 36 weekly reports validated. Missing values and dataset grain are preserved. |
| Motion Atlas browser smoke | All 20 live previews loaded. Custom brand/background colors and reset worked. |
| Showcase media | All seven Productions videos and posters returned HTTP 200 and exposed valid video metadata. An existing import sample played successfully. |
| Server boundaries | Showcase requests for private projects, an environment-file path, and repository package metadata returned 404. |
| Live component review | Import, Explorer, Dashboards, Cases, and Map loaded without JavaScript page errors. Screenshots were inspected; the loaded map retained real geography and provider attribution. |

The workspace's existing dependency build-script policy leaves `ffmpeg-static`
unbuilt on this machine. Validation used FFmpeg and ffprobe on PATH; the producer
also accepts explicit binary overrides. No dependency approval policy was changed.

## Render evidence

| Film | Output | Evidence |
| --- | --- | --- |
| Current-source import sample | `out/avandar-import/render/final.mp4` | 726 H.264 frames, 1536 × 960, 24.2 seconds. The 28-frame preview and full-size interaction frame were inspected. The unchanged gate reported no tiled frames or luminance jumps. This one-shot film uses the existing standalone setting. Browser playback reached the end with all 726 frames and no video error; screenshots at 4, 10, 17, and 22 seconds were inspected. |
| Private stock-motion project | Root `.videos/migration-check/out/migration-check/render/final.mp4` | 180 frames, 1280 × 800, 6 seconds. The preview was inspected, the unchanged frame/loop gate passed, and browser playback reached the end without a video error. |

Both verification renders are silent; there is no new narration or listening
review claim. They remain ignored local outputs. Existing narrated sample MP4s
and their original provenance were retained unchanged. The live preview uses
fictional fixture state, not authenticated queries or persistence, and this run
does not establish a new end-to-end product test.

Preview fingerprints bind exact source, lockfile, plan, and media bytes. Later
edits or commits can require a new preview before another render. Screenshots
are local under root `.temp/feat-video-producer/`; they are review artifacts,
not published sample assets.

The original local repository and its GitHub remote remain intact pending
explicit approval to merge the migration into `develop` and perform cleanup.
