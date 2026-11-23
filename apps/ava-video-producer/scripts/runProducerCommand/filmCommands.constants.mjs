/** Static help and execution contracts for this producer command family. */
export const FILM_COMMANDS = {
  "add-sfx": {
    purpose:
      "Add a separate UI sound pass to an existing rendered composition.",
    synopsis:
      "[composition-id] [--force] [--output-suffix suffix] [--title-offset frames]",
    details: [
      "composition-id defaults to demo. IDs accept letters, digits, CJK characters and hyphens, without path separators. Reads out/<id>.mp4 and scripts/beats/<id>.txt.",
      "--force permits replacing the sound pass. Default: refuse existing output; FORCE is retained.",
      "--output-suffix is a single filename suffix without path separators. Defaults to OUT_SUFFIX or -sound. --title-offset defaults to TITLE_OFFSET or 66.",
    ],
    examples: [
      "sh scripts/add-sfx.sh demo",
      "sh scripts/add-sfx.sh demo --output-suffix=-sound-v2 --title-offset 66",
    ],
    command:
      "node --import tsx scripts/requireLicense.ts && bash scripts/add-sfx.sh",
  },
  studio: {
    purpose: "Open the Remotion composition studio.",
    synopsis: "[remotion-options...]",
    details: [
      "Remotion studio options are forwarded unchanged.",
      "Default entry point and browser settings come from remotion.config.ts.",
    ],
    examples: ["pnpm studio", "pnpm studio --port=3001"],
    command: "node --import tsx scripts/requireLicense.ts && remotion studio",
  },
  "studio:licensed": {
    purpose: "Open the licensed Remotion composition studio.",
    synopsis: "[remotion-options...]",
    details: [
      "Remotion studio options are forwarded unchanged.",
      "Default entry point and browser settings come from remotion.config.ts.",
    ],
    examples: ["pnpm studio:licensed", "pnpm studio:licensed --port=3001"],
    command:
      "node --import tsx scripts/requireLicense.ts && bash scripts/studio.sh",
  },
  adopt: {
    purpose: "Copy real product stylesheet tokens into the producer theme.",
    synopsis: "[stylesheet] [--mode=auto|dark|light] [--curves] [--dry-run]",
    details: [
      "stylesheet: CSS source. Default: search conventional stylesheet paths in this directory and its parent.",
      "--mode=auto|dark|light: palette choice. Default: auto, preferring a dark palette when present.",
      "--curves: also copy easing curves. Default: leave curves unchanged.",
      "--dry-run: report without writing. Default: write theme.css.",
    ],
    examples: [
      "pnpm adopt ../src/app/globals.css --dry-run",
      "pnpm adopt ../src/app/globals.css --mode=light --curves",
    ],
    command:
      "node --import tsx scripts/requireLicense.ts && node --import tsx scripts/adoptTheme/adoptTheme.ts",
  },
  preview: {
    purpose: "Render demo stills and a contact sheet for visual inspection.",
    synopsis:
      "[body-frame...] [--composition id] [--title-offset frames] [--settle frames]",
    details: [
      "body-frame: explicit demo body frame numbers. Default: derive beats from the composition.",
      "--composition id: letters, digits, CJK characters and hyphens, without path separators. Default: demo. Direct preview scripts accept it as their first positional argument.",
      "--title-offset frames and --settle frames: non-negative integers. Defaults: TITLE_OFFSET or 66, SETTLE or 12.",
      "Outputs: out/demo-preview/.",
    ],
    examples: ["pnpm preview", "pnpm preview 30 90 174"],
    command:
      'node --import tsx scripts/requireLicense.ts && sh scripts/preview.sh "${AVA_PRODUCER_COMPOSITION:-demo}"',
  },
  render: {
    purpose: "Render, deliver, and gate the demo composition.",
    synopsis:
      "[poster-frame] [--composition id] [--deliver width:height] [--output-dir directory] [--output-id id] [--ffmpeg-bin executable] [--standalone] [--declared-cuts frames] [--keep-frames]",
    details: [
      "poster-frame: non-negative poster frame number. Default: 366.",
      "--composition id: letters, digits, CJK characters and hyphens, without path separators. Default: demo. Direct render scripts accept it as their first positional argument.",
      "--deliver width:height defaults to DELIVER or 1536:960. --standalone skips loop checks (STANDALONE=1). --declared-cuts comma-separated frames defaults to DECLARED_CUTS or none.",
      "--output-dir and --output-id override RENDER_OUT_DIR (out) and RENDER_OUTPUT_ID (composition ID). --keep-frames retains frame sequences (KEEP_RENDER_FRAMES=1).",
      "Explicit output IDs use ASCII letters, digits, underscores or hyphens. The default output ID preserves the composition ID, including CJK characters.",
      "--ffmpeg-bin executable overrides FFMPEG_BIN; default: pinned binary, then ffmpeg on PATH.",
      "Rendering stays serial and must pass the picture gate.",
    ],
    examples: ["pnpm render", "STANDALONE=1 pnpm render 300"],
    command:
      'node --import tsx scripts/requireLicense.ts && sh scripts/render.sh "${AVA_PRODUCER_COMPOSITION:-demo}"',
  },
  check: {
    purpose: "Measure tiled frames, luminance jumps, and the demo loop seam.",
    synopsis: "[video-file] [--standalone] [--declared-cuts frames]",
    details: [
      "video-file: optional override of the package default out/demo.mp4.",
      "--standalone: skip the loop seam check. Default: check it.",
      "--declared-cuts frames or --declared-cuts=frames: comma-separated non-negative cut frames. Default: none.",
    ],
    examples: [
      "pnpm check",
      "pnpm check out/film.mp4 --standalone --declared-cuts 120,240",
    ],
    command:
      "node --import tsx scripts/requireLicense.ts && node --import tsx scripts/checkFrames.ts",
  },
  "render:showcase": {
    purpose: "Typecheck, preview, render, and gate the fixed showcase films.",
    synopsis: "[--preview-only]",
    details: [
      "--preview-only: stop after previews. Default: PREVIEW_ONLY or false.",
      "Runs the home storyboard, TitleStudy, and MotionLab in sequence. Outputs remain under out/.",
      "Environment: PREVIEW_ONLY=0 by default; set to 1 to stop after previews.",
    ],
    examples: ["pnpm render:showcase", "PREVIEW_ONLY=1 pnpm render:showcase"],
    command:
      "node --import tsx scripts/requireLicense.ts && sh scripts/render-showcase.sh",
  },
  "preview:showcase": {
    purpose: "Typecheck and preview the fixed showcase films.",
    synopsis: "",
    details: [
      "No command-specific arguments or options.",
      "Runs home storyboard, TitleStudy, and MotionLab previews; sets PREVIEW_ONLY=1.",
      "Outputs remain under out/ for visual inspection.",
    ],
    examples: ["pnpm preview:showcase"],
    command:
      "node --import tsx scripts/requireLicense.ts && PREVIEW_ONLY=1 sh scripts/render-showcase.sh",
  },
  "data:generate": {
    purpose: "Generate reproducible fictional Harborfield demonstration data.",
    synopsis: "[--check|--model]",
    details: [
      "--check: compare checked-in fixtures without writing. Default: regenerate CSVs and manifest.json.",
      "--model: print typed rows as JSON without writing. Mutually exclusive with --check.",
      "All generated records are fictional demonstration data.",
    ],
    examples: ["pnpm data:generate --check", "pnpm data:generate --model"],
    command:
      "node --import tsx scripts/requireLicense.ts && python3 demo-data/generate.py",
  },
  "data:validate": {
    purpose: "Validate the checked-in fictional demonstration fixtures.",
    synopsis: "",
    details: [
      "No command-specific arguments or options.",
      "Checks demo-data fixture files and manifest relationships.",
    ],
    examples: ["pnpm data:validate"],
    command:
      "node --import tsx scripts/requireLicense.ts && python3 demo-data/validate.py",
  },
};
