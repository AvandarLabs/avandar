# Live showcase validation

Validated on 2026-10-15 in `feat/video-producer`. Changes remain separate from
`develop`. All implementation changes are under `apps/ava-video-producer/`.

## Shipped behavior

- Homepage, all seven Productions films, and all 20 Atlas presets use live React
  previews. No preview requests MP4 media.
- Imported Avandar source, CSS, adapters, compositions, storyboards, and Atlas
  theme inputs refresh the relevant players. A temporary product CSS change
  reached an open player automatically and was restored exactly.
- Download MP4 renders current source and options on demand. Product captions
  and Atlas accent/background selections reach the render. Active downloads
  survive source refreshes. Exports and caches stay ignored.
- The 31 previously tracked MP4s are removed. Original local copies were retained
  under ignored `apps/ava-video-producer/out/pre-live-mp4s/`.
- Visible and copied showcase source paths use the monorepo root, including
  `apps/ava-video-producer/docs/using-avandar.md`.
- The starter Geist font is bundled locally with its license. Product scenes
  retain their source typography.

## Verification

| Check | Result |
| --- | --- |
| App tests | 88 passed, 0 failed |
| Source and tool TypeScript checks | Passed |
| ESLint for changed showcase code | Passed |
| Diff whitespace check | Passed |
| Homepage clip switching | All three live players loaded |
| Productions | All seven live players loaded, zero video elements |
| Source refresh recovery | Failed API loading recovered on the next source event |
| Download during refresh | Import export continued and browser downloaded it |
| Palette refresh | Amber and Shell choices survived Atlas source refresh |
| Mobile layouts | 390px viewport, no horizontal page overflow |
| Path audit | Homepage and Productions show full monorepo-relative paths |

## Completed on-demand exports

| Film | Local job | Checked output |
| --- | --- | --- |
| Homepage | `60799b5d-beea-4454-9066-84c464bed0b2` | 590 frames, 1536x960, 19.667 seconds, silent, picture gate passed |
| Plexus field | `708cce09-896a-4d7f-817f-8343dfe11e1e` | 180 frames, 1280x800, 6 seconds, Amber #de911d and Shell #486581, picture gate passed |
| Import | `91a546f6-9699-4031-8b0e-b37368b06179` | 726 frames, 1536x960, 24.2 seconds, H264 and AAC narration, picture gate passed |

Each job retains inputs, its captured bundle/assets, sample frames, frame-check
output, and delivery metadata below
`apps/ava-video-producer/out/showcase/exports/<job-id>/`.
The export pipeline also verifies audio signal, duration, and unchanged encoded
picture packets. Selected encoded frames and desktop/mobile screenshots were
inspected. This is not a completed editorial listening review.

## Limits retained

Narration is scratch system speech on macOS. Other platforms use captions and
silent playback. Product previews use fictional fixtures and do not execute
backend operations. The native map still needs public basemap network access.
Product brand/background controls and final voice review remain on the homepage
checklist. Existing React Doctor findings across the migration were not expanded
into unrelated cleanup. Its font-loading diagnostic was assessed as intentional
one-time font registration and verified with a completed render.

## Review artifacts

Screenshots are in `.temp/feat-video-producer/` at the worktree root. A convenience
copy of this record, the plan, and screenshots is saved under
`~/Downloads/feat-video-producer/live-showcase/`.
