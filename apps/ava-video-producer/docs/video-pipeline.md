# Local storyboard video pipeline

`scripts/video.ts` takes a versioned JSON storyboard through validation, review artifacts, composed-film previews, picture rendering, and optional audio assembly. It orchestrates Remotion and the existing JPEG/FFmpeg/frame-gate pipeline locally. It does not draft a story, drive the product browser, perform speech recognition, publish a video, or certify that product claims are true.

The input schema is [schema.ts](../src/storyboard/schema.ts). The generic Remotion composition is `story-film`, with props `{ "plan": <storyboard> }`. Its duration, canvas and FPS come from the validated plan. A generic film does not require a 66-frame opening: only a shot explicitly using the existing `title` scene has that duration requirement.

## Commands

Run from `apps/ava-video-producer` with installed dependencies, Node 22 or newer, `ffprobe` on PATH and the pinned `ffmpeg-static` binary. Scratch TTS additionally needs macOS's existing `/usr/bin/say`. No global package installation or cloud voice service is required.

```sh
pnpm video validate storyboards/library.json
pnpm video plan storyboards/library.json
pnpm video preview storyboards/library.json
pnpm video render storyboards/library.json
```

Inspect the preview before the render command. A generated preview manifest proves which inputs were rendered; it does not record human approval or prove visual correctness.

| Command | Behavior | Principal output |
| --- | --- | --- |
| `validate` | Parses the strict schema, resolves every asset under `public/`, probes visual/audio streams and checks media timing | Console validation summary |
| `plan` | Exports the same narration and timeline used by the composition | `out/<id>/plan/` |
| `preview` | Renders meaningful absolute frames from the complete composition, including incoming/outgoing transition frames | `out/<id>/preview/` |
| `render` | Requires a matching complete preview, invokes the existing renderer and mandatory frame gate, then assembles audio | `out/<id>/render/final.mp4` |
| `tts` | Synthesizes one local scratch recording per narration cue and creates a derived plan | `out/<id>/scratch/storyboard.json` |
| `align` | Imports supplied audio plus manually aligned, exact-text SRT timing into a derived plan | `out/<id>/aligned/storyboard.json` |

All subprocesses use argument arrays without shell interpolation. The only shell invocation runs the fixed `scripts/render.sh` file with separate arguments. No command reads `.env.local`. The existing Remotion configuration keeps `Config.setDotEnvLocation("remotion.env")`.

## Planning and media validation

A plan contains ordered shots, scene-specific inputs, narration cues, optional audio references, captions, sound effects, canvas/delivery dimensions and evidence notes. See [the library study](../storyboards/library.json) for an example. The scene discriminator selects the renderer; an unknown scene or unknown schema field is rejected.

Narration cue frames are relative to their referenced shot. Sound-effect frames and the optional full narration track's start frame are absolute film coordinates. Timeline and caption export use the same conversion. SRT/VTT timestamps round frame boundaries to the nearest millisecond.

Assets use paths relative to `public/`, for example `captures/demo/chart.png` or `narration/demo/take/cue.wav`. URLs, hidden path segments and traversal are rejected. Resolution rejects symlink escapes and hidden resolved targets. CLI JSON/audio/SRT inputs are checked for permitted extensions and regular-file targets before their contents are read.

Validation checks:

- Media shots have a visual stream. Video duration covers the requested trim and shot duration.
- Per-cue audio fits its cue. A full narration track fits the film and covers the aligned cue range.
- Sound effects contain audio and finish within the film.
- Dimensions and aspect ratios, shot/cue order, references and event timing satisfy the schema.

Validation does not listen to speech or prove that a provided recording says the transcript. Exact SRT text matching checks the supplied text, not the audio's words.

## Plan outputs

`out/<id>/plan/` contains:

| File | Meaning |
| --- | --- |
| `storyboard.json` | Validated plan snapshot, including schema defaults |
| `props.json` | Remotion props wrapper `{plan}` |
| `shotlist.md` | Shot order, absolute start frames, duration, on-screen notes, narration and evidence |
| `transcript.txt` | Narration text from the plan |
| `captions.srt` | Numbered, frame-derived SRT cues |
| `captions.vtt` | WebVTT cues with stable cue IDs |

Text-only narration is allowed for planning and silent previews. A final render without audio references remains silent even if captions are present. The CLI reports the distinction.

## Preview and render proof

Preview uses the installed Remotion bundler/renderer APIs and one headless browser, rendering stills sequentially. Only the plan's referenced public assets are copied into the temporary preview bundle. The complete `StoryFilm` composition is rendered at each sampled absolute frame, so dissolves, captions and underlying footage are visible together. Samples include shot boundaries, transition midpoints/endpoints, settled frames, graph traversal, flowchart steps, metric count completion, callout timing and caption midpoints.

`out/<id>/preview/` contains individual `still-NNN.jpg` files, `contact-sheet.jpg`, a labeled `index.html` linking to full-size stills, and `manifest.json`. The contact sheet cells follow the manifest's sample order. The HTML review page names each frame, time and shot. Temporary bundle copies are removed after successful completion.

The manifest fingerprints:

1. Exact source-plan bytes and the parsed plan.
2. Every referenced asset's SHA-256.
3. Renderer source files, Remotion configuration, dependency lockfile and pipeline/gate scripts.

Render refuses a missing/incomplete preview or any changed fingerprint. Preview and render also compare inputs again at completion to catch concurrent edits. Changing only narration text or an audio asset still requires a new preview, because captions and timing are part of the film.

The command does not manufacture a review approval flag. The agent or person must still inspect real frames for layout, product fidelity, correct pointer targets, legible captions, useful dwell time and honest transitions.

## Picture rendering and delivery

The CLI delegates picture creation to [render.sh](../scripts/render.sh), using this environment contract:

| Variable | CLI value | Legacy default |
| --- | --- | --- |
| `RENDER_OUT_DIR` | Absolute `out/<id>/render` | `out` |
| `RENDER_OUTPUT_ID` | Storyboard ID | Composition ID |
| `REMOTION_PROPS_FILE` | Absolute JSON file containing `{plan}` | No extra props |
| `DELIVER` | Plan delivery width and height | `1536:960` |
| `STANDALONE` | `1` only for standalone plans | Loop-seam check remains enabled |
| `KEEP_RENDER_FRAMES` | `1` until audio and final checks finish | Existing successful-gate cleanup |

The positional composition argument is `story-film`; the poster frame is a settled frame in the final shot. The wrapper keeps the original picture pipeline: JPEG sequence at quality 90, `--concurrency=1`, 30 fps, Lanczos delivery scaling, H.264 High profile, CRF 21, no B frames, keyframe interval 60 and faststart. The gate script and its thresholds are unchanged.

A failed picture gate stops the command. Frame JPEGs remain available for inspecting the flagged image. With the CLI's retention flag, later audio/hash/duration failures also leave the rendered frames. A fully successful run removes the large sequence after the final deliverables and metadata have been written.

Final render outputs include the checked silent `<id>.mp4`, `<id>-poster.jpg`, `final.mp4`, props and a manifest. The poster is copied from the real rendered sequence. Plan/caption artifacts are refreshed from the exact rendered plan.

The numerical frame gate detects specific image repetition and luminance faults. It cannot validate a product claim, an analytical result, a click target, narration intelligibility or caption fit. Watch the complete video after it passes.

## Scratch narration

```sh
pnpm video tts storyboards/library.json
pnpm video tts storyboards/library.json --voice Samantha --rate 175

# Use the derived plan for every later stage.
pnpm video validate out/scene-library/scratch/storyboard.json
pnpm video plan out/scene-library/scratch/storyboard.json
pnpm video preview out/scene-library/scratch/storyboard.json
pnpm video render out/scene-library/scratch/storyboard.json
```

The default uses the installed system voice at 175 words per minute. `--voice` names an already available system voice; availability differs by machine. `--rate` accepts 80 through 240. This is temporary narration for pacing and pipeline checks, with scratch provenance added to the derived plan and metadata. It is not a cloned voice or a final performance.

Each cue is synthesized to AIFF, then converted to 48 kHz mono WAV under a new unique `public/narration/<id>/scratch-<uuid>/` directory. If speech exceeds the cue window, a pitch-preserving tempo adjustment of at most 1.35 is allowed. A larger mismatch fails with the original and allowed durations. The command never uses a time cut to force speech to fit. Shorter audio remains shorter, leaving the planned reading pause intact.

`out/<id>/scratch/` retains cue text, raw AIFF files, the derived plan and metadata recording voice, rate, tempo and measured durations. The source plan is unchanged. Old public audio assets are preserved because backed-up plans may still reference them.

On platforms without `say`, use a supplied recording through `align`.

## Import a provided recording and SRT

```sh
pnpm video align storyboards/library.json \
  --audio /absolute/path/narration.wav \
  --srt /absolute/path/narration.srt
```

The SRT must have the same cue count and text as the plan, in the same order. Whitespace differences are normalized; wording changes are rejected. Timings are absolute film times and each cue must still fit its associated shot. A full recording begins at film time zero, so include the necessary leading silence or align the speech accordingly.

This imports manual timing through `applySrt`. It is not ASR, forced alignment, word-level alignment or automatic transcription. The command removes per-cue recording references, adds one narration track, copies the supplied recording to a content-addressed file under `public/audio/<id>/`, and writes the derived plan, copied SRT and provenance metadata under `out/<id>/aligned/`.

Run plan, preview and render against the derived aligned plan. The original audio and source plan are left in place.

## Narration and effects mix

The picture renderer intentionally produces silent video. [media.ts](../scripts/lib/media.ts) combines the plan's narration and sound-effect tracks after the picture passes its gate. Source video sound is not automatically included; add an explicit sound asset if it is part of the intended mix.

Tracks are resampled to 48 kHz stereo, scaled by their configured volume, delayed to their absolute frame positions, mixed and limited. Silence pads the remaining film duration. AAC output uses 192 kbps; picture uses `-c:v copy`.

The mixer rejects a mismatched input-picture duration or an overlong track before mixing. Afterwards it checks for an audio stream, film duration, a measurable signal when enabled tracks are present, and unchanged encoded video packets. The tests also compare decoded frame hashes and inspect separate narration/SFX time windows. These checks do not replace listening to the finished film.

## Safe reruns and retained evidence

Each stage has its own output directory. Before replacing an existing stage, the CLI moves that entire directory into `out/<id>/.history/<stage>-<timestamp>-<suffix>/`. It refuses symlink/file destinations. It does not recursively erase an old stage to make a command succeed.

Public narration/recording assets use unique or content-addressed names. They are not automatically deleted, because previous plans may still need them. Failed preview/render output remains available for diagnosis. A failed preview has no complete manifest, so it cannot authorize rendering.

Keep raw captures, full recordings, browser state and generated scratch audio local under ignored paths. Reviewed synthetic Avandar screenshots, their evidence, and gallery MP4s are deliberately committed as approved shareable samples so the examples work in a fresh clone. No command commits, pushes, publishes, changes product data or updates Linear.

## Verification

```sh
npx tsx --test tests/storyboard.test.ts tests/pipeline.test.ts
```

The tests cover schema/timeline/caption consistency, manual SRT matching, invalid inputs and asset paths, preview transition samples, stale evidence rejection, directory symlink handling, track overrun rejection and a two-second synthetic FFmpeg mix. The mix test verifies unchanged packet and decoded-frame hashes, unchanged duration, audible narration and effects in separate windows, and a quiet gap between them. It does not launch a full Remotion render.

The local run on 2026-10-14 exercised validation, plan export, five macOS scratch narration cues, a 54-frame composed-film preview and the complete render/mix path. The contact sheet and full-size graph, flowchart and metric frames were visually inspected. The resulting `out/scene-library/render/final.mp4` has 846 H.264 frames at 1536 by 960, 28.2 seconds of duration and a 48 kHz AAC track. The unchanged frame gate reported no tiled frames or luminance jumps. Every narration cue had measured signal, and the final video packets matched the checked silent picture. A separate two-second smoke test exercised recording/SRT import.

This is scratch narration and a generic scene-library study, not an Avandar product demonstration or a final voice performance. Full playback and listening remain delivery review tasks. Each run's manifest records the exact inputs used; later source or dependency changes require a new preview before another render.

## Avandar component films

The `avandar` scene renders product React components through an isolated entry
point. Preview and render commands rebuild current worktree components
automatically. Run `npm run component:measure` after changing layout or beats. The video CLI
chooses `src/avandar-entry.tsx`, samples the measured interaction beats, and
hashes generated JavaScript/CSS, adapters, and the source manifest alongside
the storyboard and audio. Both preview and final rendering stage only the
plan's referenced public assets. See [component videos](component-videos.md)
for the complete build and review sequence.
