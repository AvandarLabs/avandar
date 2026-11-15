# Scene-library render validation

The current shared renderer was exercised on 2026-10-14. This is a generic
scene-library study using fictional dataset counts and locally generated
scratch narration. It is not a recording of Avandar's product interface.

Commands completed successfully:

```sh
pnpm video preview out/scene-library/scratch/storyboard.json
pnpm video render out/scene-library/scratch/storyboard.json
```

The 54-frame preview samples the actual composed film, including transition
boundaries and caption timing. The complete contact sheet and full-size opening
(frame 42), graph (frame 333), flowchart (frame 528) and metric (frame 673) were
visually inspected. The opening accurately says “Reusable scenes, fictional
demo data”; the study contains no captured product footage.
Graph labels, nodes and captions have clear separation; sampled settled scenes
are readable. Temporary title overlap during dissolves is visible in the
transition samples. The initial dark title frames are intentional.

The render finished at `2026-10-14T22:14:17.171Z`, using JPEG quality 90 and
Remotion concurrency 1. The mandatory unchanged frame gate reported no tiled
frames and no luminance jumps above its threshold. The loop seam was correctly
excluded for this standalone film. Remotion emitted no Zod version mismatch.

| Check | Result |
| --- | --- |
| Picture | 846 H.264 frames, 1536 by 960, 30 fps |
| Duration | 28.2 seconds |
| Audio | AAC, 48 kHz, five scratch narration cues |
| Narration cue peaks | -6.0, -6.4, -5.4, -5.8 and -6.9 dBFS |
| Caption band | 187 px, calculated from the tallest cue; 813 px retained for scenes |
| Picture after audio mix | Encoded video packet hash unchanged |
| Preview/render/current inputs | Matching fingerprints at delivery |
| Showcase copies | All five SHA-256 hashes match their render/plan sources |

The final source-plan SHA-256 is
`cdfcffd9f2e5ee4d8b090ead9b446177db1538cc3eccf23381f52bf5fa908b4f`.
The renderer fingerprint is
`592f5a6d73beb265d0db1e924c9adfd4366b53a9118ad540a743807164644359`.
The delivered MP4 SHA-256 is
`30669bc01d4590bfdbd714e49ebc7a2d00173685a42512ac245b71877a6e26c0`.

The caption correction shares exact fitted geometry between the overlay and
the reserved scene band. Regression tests cover a 180-character cue on a
1600 by 1000 canvas and reject a 960 by 800 canvas that leaves insufficient
scene space. The full 41-test suite passed after that correction. The later
metric correction fits label, number/unit, detail and spacing together while
keeping sizes fixed across frames; its 12 focused scene tests and both
application/tools TypeScript checks passed before this final preview/render.
Deterministic fixture regeneration and the independent fixture validator also
passed. The unchanged narration text reused the previously measured scratch
recordings; correcting the opening did not require another synthesis pass.

Delivered files are the [video](../showcase/assets/scene-library.mp4),
[poster](../showcase/assets/scene-library-poster.jpg),
[SRT captions](../showcase/assets/scene-library.srt),
[WebVTT captions](../showcase/assets/scene-library.vtt) and
[transcript](../showcase/assets/scene-library.txt). Captions are also rendered
into the video picture. Original showcase assets remain unchanged.

Local manifests and the detailed delivery report are under
`out/scene-library/render/`; preview images are under
`out/scene-library/preview/`. Prior runs remain in `.history/`; the replaced
showcase set is in `.history/showcase-OuwDNM/`. This record
covers sampled visual inspection and signal/duration/hash checks. It does not
claim a complete playback or listening review, or a final voice performance.
