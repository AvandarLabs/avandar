# Pipeline and product-film validation

This records the earlier screenshot-based delivery and browser rehearsal.
The rebuilt React component films have a separate
[validation record](component-video-validation.md). Earlier media remains in
Git history and local delivery backups; filenames in the showcase are reused.

Validation date: 2026-10-14. The implementation closes the five original
tooling gaps: reusable scenes, real product capture, structured storyboards,
narration/captions, and local assembly. Claude Code or Codex remains the agent.
See the [implementation plan](implementation-plan.md),
[architecture assessment](agent-architecture.md), and
[agent user manual](using-avandar.md).

## Research and reproducible inputs

- The [Linear review](linear-feature-review.md) covers 323 accessible issues,
  including all 93 Done issues and archived completed work. Four Done items
  concern onboarding rather than Avandar features.
- The [product docs review](product-docs-review.md) inventories 132 Markdown
  files, records its review method, and distinguishes design proposals from
  current implementation and runtime evidence.
- The [video priorities](video-priorities.md) explain why the flagship follows
  CSV import, a district comparison, and a dashboard, with separate case and
  map previews.
- The deterministic [Harborfield fixtures](../demo-data/README.md) contain
  240 cases, 297 visits, 12 facilities, six district boundaries, and 36 weekly
  reports. Regeneration matches the checked-in hashes. The validator checks
  types, relationships, totals, 19 awaiting-contact cases and two missing
  reports. Missing reports remain missing.

The local product was read and run at commit
`3c164aa32b8a60b30885081e7bb0986135e99f70`; its checkout remains unchanged.
The product's existing local backend was used without resets or migrations.
The fifth CSV, weekly reports, is versioned for future stories but was not
imported because the local plan already contained five datasets, including
one preexisting dataset. No unrelated dataset was deleted.

## Accepted browser capture

`pilot-2026-10-14T22-11-57-800Z-Z53br8` passed all five flows, 18 actions and
14 screenshot checkpoints, with zero blocked requests. Authentication took
place before recording; the browser viewport was 1440 by 900. The runner
suppresses only the known feedback-widget configuration request and records
that suppression. It permits the specific readonly basemap endpoints needed
by the real map. These are operational capture boundaries, not security
claims about arbitrary flow code or local server proxies.

The checked-in [capture evidence](../public/avandar/capture-evidence.json)
records source-run and screenshot hashes, fixture hashes, action URLs and
resource identities. Raw video, diagnostic failures and full manifests remain
ignored under `out/captures/`. The curation command accepted only passed,
hash-matching evidence and preserved the preceding curated set in `out/`.

| Workflow | Observed result |
| --- | --- |
| Import | Actual CSV preview and persisted dataset metadata: 240 rows, 13 columns. The initial import created the fixture datasets; the final run reused their saved identities |
| Explorer | Eastbank filter returned 56 rows. Grouped results matched Eastbank 56, North Quay 51, South Gardens 40, Lakeside 39, Ridge 29 and West Marsh 25. The chart displayed six bars |
| Dashboard | The district chart was saved to the named dashboard, inspected in the editor and opened in owner preview. No public publication was performed |
| Case Manager | All 240 unique record URLs and labels matched. Record 001 showed North Quay, contacted, one delivered supply kit and HF-0001 in both source-key fields |
| Maps | 240 case points and 12 facility points were mapped, styled with distinct blue/orange symbols and retained after reload. Both layers and their visible diagnostics were checked |

Fixture hashes identify local input bytes. Reusing a saved dataset by name
does not establish byte-for-byte identity of every persisted value. The
visible aggregate, record and mapping assertions establish the narrower facts
above. The accepted map already contained both layers, so its film describes
inspection and comparison, without implying a fresh layer insertion.

## Recorded action and visual review

The overview includes a real filtering action from the earlier passed run
`pilot-2026-10-14T22-08-57-110Z-VND11E`. Its
[clip evidence](../public/avandar/clip-evidence.json) records the source hash,
inspected trim, FFmpeg arguments, output hash and editorial timing. Source
frames from 14.9 to 16.4 seconds were slowed to half speed, normalized from
25 to 30 fps, and held on the verified 56-row result. A one-second cloned
pre-roll is skipped with `trimBefore: 30`, exercising nonzero video seeking.
The final seven-second shot retains the actual loading state and result.

All captured proof states and the complete product contact sheets were
visually inspected. Full-size checks include the import callout, filtered
video result, case detail, chart/dashboard labels and map layers. Captions
occupy a separate band sized from the tallest cue, rather than covering the
application. Crossfades intentionally overlap outgoing/incoming images for
18 frames. Dark opening frames belong to the starter TitleCard.

One initial recorded-video preview showed a corrupted held frame. The source
video was clean. Re-encoding the normalized clip without B-frames and
regenerating the preview produced a clean held frame; this observation does
not establish a general decoder root cause. The evidence records the final
encoding, and final output must be checked independently of a preview.

## Delivery verification

All seven new films completed rendering, passed the unchanged gate, and were
copied into the [Productions gallery](../showcase/productions.html). Their
35 delivered files match their render/export sources. Exact SHA-256 hashes,
render fingerprints, media properties and per-cue audio measurements are
preserved in [delivery-evidence.json](delivery-evidence.json).

| Film | Duration | Delivered scope |
| --- | ---: | --- |
| [Scene library](../showcase/assets/scene-library.mp4) | 28.2 s | Typography, graph traversal, flowchart and metric; fictional editorial study |
| [Avandar overview](../showcase/assets/avandar-overview.mp4) | 38.2 s | Import preview, recorded filter action, district comparison, chart and dashboard preview |
| [CSV import](../showcase/assets/avandar-import.mp4) | 17.2 s | Real upload preview, measured naming callout and saved dataset |
| [Data Explorer](../showcase/assets/avandar-explorer.mp4) | 24.2 s | Eastbank filter, grouped result and six-bar comparison |
| [Dashboards](../showcase/assets/avandar-dashboards.mp4) | 24.2 s | Explorer chart, saved editor and owner preview |
| [Case Manager](../showcase/assets/avandar-cases.mp4) | 24.2 s | Case type, record list and source-backed detail; local product preview |
| [Maps](../showcase/assets/avandar-map.mp4) | 24.2 s | Case/facility point configuration and combined map; local product preview |

Each MP4 contains 1536 by 960 H.264 picture at 30 fps and AAC audio at
48 kHz. All 24 narration windows have non-silent signal below 0 dBFS.
Matching previews, final picture packet hashes, duration and exact caption
exports were verified for every film. The original three starter films are
unchanged.

Contact sheets sampled 238 frames from the delivered MP4s, including
transitions, captions and held results. They were inspected alongside key
full-size frames. The final filter hold is clean in the encoded overview.
The map's reloaded layer state is visible; its final capture also shows a
pending viewport save after zooming, so it does not establish persistence
of that last camera adjustment.

The gallery was inspected at 1440 by 1000 and 390 by 844, with no horizontal
overflow. All seven players loaded metadata and reached the end without
media errors in a muted 4x playback smoke check. All 21 linked MP4,
transcript and SRT downloads returned HTTP 200. Normal playback speed and
unmuted controls were restored. This check establishes playback, not a
listening review.

The [library validation](library-validation.md) records its completed
28.2-second study. Each storyboard render requires a matching composed
preview, uses Chromium concurrency 1, passes the unchanged frame gate, then
mixes narration without re-encoding the checked picture. Audio checks probe
duration and signal; encoded video packet hashes must remain unchanged.
Scratch speech is generated locally by macOS `say`, with bounded tempo
adjustment and no truncation. Transcripts, SRT and VTT share the storyboard's
exact cue text and timing.

The final code checks passed: both TypeScript configurations, all 43 tests,
and the fixture validator. Tests include capture lifecycle/network guards,
failed-evidence rejection, safe curation/replacement, storyboard references
and timing, preview fingerprints, narration plus SFX retention, caption-band
geometry and compact metric layout. No global npm package was installed;
the Playwright browser download and platform prerequisites are documented
in the [README](../README.md).

## Product limitations retained in the delivery

- WKT district geometry failed with a DuckDB Binder Error referring to an
  internal geometry column. Its task-owned failing layer was removed through
  the UI. The map film establishes point layers only, not polygons, spatial
  joins, travel time, export or publication.
- A transient point-query failure followed the WKT attempt. Points worked
  on a fresh page and in both accepted full runs; a cache/timing explanation
  remains a hypothesis.
- Case pagination repeated boundary records. Verification deduplicated URLs
  and matched all expected labels; reloading restored a clean visible list.
  Synchronization was not repeated on populated records because it can
  replace record IDs and reset operational state.
- The app displayed some date-only CSV values one day earlier in this
  timezone. The videos make no date-fidelity claim. The source data remains
  unchanged, and the manual records this issue.
- Case management and GIS are labeled local product previews. Completed
  tickets and source availability do not establish public release status.

These films are internal capability examples with scratch speech. Signal and
timing checks do not prove spoken-word accuracy or a final voice performance.
No complete human listening review is claimed. A final voice performance,
public-release framing, automatic speech alignment, hosted orchestration and
publication remain separate work, rather than hidden capabilities of this kit.
