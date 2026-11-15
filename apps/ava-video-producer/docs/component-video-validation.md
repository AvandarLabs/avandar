# Component film validation

This is the historical validation record for the tracked sample MP4s. The workspace
producer reads current product source directly; new builds and renders need fresh
validation. The source snapshot mentioned below describes the original export.

The six Avandar films use actual product code from revision
`3c164aa32b8a60b30885081e7bb0986135e99f70`, with a 665-file source snapshot
and its SHA-256 manifest. The product checkout was read-only and remained clean.

## Source and fixture checks

- All snapshot files match their recorded source hashes. The generated bridge
  matches its build hash and rebuilds from the committed snapshot.
- Adapter fixtures match every CSV row, column, string and missing value.
- Verified 240 unique cases, 297 visits, 12 facilities, six districts,
  36 weekly reports, 19 awaiting-contact cases and two missing reports.
- Seven component-specific tests cover source parity, fixture grain, map
  inputs, allowed scene timelines, six component-only plans and cursor holds.
- TypeScript checks and all 58 repository tests passed during integration.

## Visual review

Each feature was inspected at several authored states before film previews.
The review caught and corrected stylesheet order obscuring active tabs,
production-mode Lingui interpolation, clipped SQL controls, missing editor
styles, overlapping map controls, a cursor target on a drag handle instead
of its visibility button, and a target sampled before the native map settled.

All 30 final cursor targets were measured from rendered 1600 × 840 bounds.
The measurement script acknowledges the selected frame, waits for Remotion
and native map readiness, then requires stable bounds before recording them.
The map point target changes from (888.75, 504.25) before the camera movement
to (876.81, 444.61) at the final click.

Out-of-order frame seeks produced matching DOM text in every sampled state.
Explorer's three sampled states were pixel-identical. A few other states
showed small antialiasing differences at rounded panel edges, recorded in the
review evidence; these were visually inspected rather than silently accepted
as identical. No changed fixture values or missing interface state was found.

The 276 final composed preview samples cover all six films, including title
and feature handoffs, typing, clicks, result changes, map camera movement and
caption midpoints. [Preview fingerprints](evidence/component-film-previews.json)
bind those inspected samples to the final renderer and narration assets.

Known source behavior remains visible: date-only values in the import preview
use the product's local-time formatter, so an August 3 CSV date displays
August 2 in New York, as it did in the original app capture. Explorer displays
the date string directly. The create-dashboard form can select its typed name
in fresh render contexts. Neither changes the underlying fixture bytes.

## Delivery evidence

All six replacement MP4s were rendered serially and passed the unchanged
picture gate, with no tiled frames or luminance jumps above its threshold.
Delivery validation confirmed 1536 × 960 video at 30 fps, the expected frame
counts and an audio stream. Posters were decoded from the completed result
hold in each final MP4. The gallery's video and poster URLs include content
revisions, so reloading fetches the replacements.

| Film | Frames | Duration | Picture gate |
| --- | ---: | ---: | --- |
| Import | 726 | 24.20 s | Passed |
| Explorer | 866 | 28.87 s | Passed |
| Dashboard | 786 | 26.20 s | Passed |
| Case Manager | 726 | 24.20 s | Passed |
| Map | 786 | 26.20 s | Passed |
| Overview | 2246 | 74.87 s | Passed |

Final delivery records are generated under `showcase/assets/avandar-*.json`.
They bind source revision, video and poster hashes, dimensions, frame counts,
preview fingerprints and the unchanged picture gate result. Full frame
sequences, composed contact sheets and previous gallery backups remain local
under ignored `out/`.

The [browser playback record](evidence/component-film-playback.json) covers
all six delivered files in the refreshed gallery. The initial files played from the
beginning to their native `ended` event at 4× speed, muted, with no media or page
errors. Three seeks per film produced distinct decoded sample images. Video
dimensions, duration and revised URLs matched their delivery records; range
requests returned 206, and transcripts, SRT and VTT downloads returned 200.
Accelerated playback's presentation-frame drops are recorded in the evidence;
the encoded frame counts were verified separately. The preserved starter
showcase and Motion Atlas also loaded successfully.

Narration is the macOS Samantha scratch voice at 170 words per minute.
Synthesis and mixing check cue duration, audio signal and unchanged video
packets. No claim of human listening review or final voice performance is made.
The footage uses frame-controlled fixture state, not backend execution; prior
browser capture evidence remains a separate record.

## Map basemap correction

The initial component map explicitly selected `No basemap`, which omitted all
tiles. The corrected adapter selects the product's built-in `avandar` basemap,
including its unchanged `applyMapStyles` behavior. The same fictional points
now appear above real roads, water, land and geographic labels. Visible
attribution follows the [provider's video requirements](https://openfreemap.org/).

[Basemap checks](evidence/map-basemap-check.json) cover nine states before,
during and after the camera movement and feature-drawer opening. Each has
loaded tiles and 40 to 116 rendered basemap features, with no runtime or
provider response errors. Intentionally blocking the vector source cancels
the render and never reports a ready basemap. All six pointer targets were
remeasured and match the previous positions. Repeat seeks matched the map;
6 to 19 changed pixels were confined to panel corners or the drawer close
control, consistent with the earlier compositor antialiasing differences.

The check records observed public style and TileJSON response hashes. These
are live provider assets, so future renders require network access and can
reflect later map-data updates. Local renderer fingerprints cover code and
local assets, not all remote map data. The other five delivered films retain
their existing files and validation records.

The corrected 26.2-second map MP4 passed the unchanged frame gate, with no
tiled frames or excessive luminance jumps. Its final export then played from
start to finish at normal speed in Chromium: 786 presented-frame callbacks,
zero dropped frames and no media or page errors. The MP4 and poster were
replaced together with revised gallery URLs. Their hashes and the corrected
preview fingerprint are recorded in `showcase/assets/avandar-map.json`.


## Shared cursor replacement (2026-10-15)

The shared cursor now uses native macOS assets with subpixel travel, a shallow
eight-frame press/release, a restrained subframe motion-blur shutter, and
I-beam holds through typing. Clickable targets use the native hand. Hotspots
retain their measured coordinates. Grab shapes are available for future drag
choreography; the existing map movement remains an authored zoom.

All six product films, the generic starter demo, and Motion Lab were previewed,
inspected, rendered with one worker, and passed the unchanged frame gate. The
six product exports each completed full normal-speed Chromium playback with
zero dropped frames, no media errors, and one presented callback per frame.
The two generic clips also completed normal-speed gallery playback without
dropped frames or media errors. Three decoded browser samples per product
film remain under `out/cursor-review/`.

Typechecking, all 61 tests, and fixture validation passed. Decoded audio hashes
match the prior exports for all six narrated films, so this visual revision
preserves narration; this is not a new listening review. All replaced MP4 and
poster URLs have revised cache keys. [Cursor evidence](evidence/cursor-upgrade.json),
[preview records](evidence/component-film-previews.json), and
[playback records](evidence/component-film-playback.json) describe this replacement
and supersede the earlier delivery hashes. Basemap readiness and failure checks
above remain applicable to the unchanged map adapter.
