import { CompositionIds } from "./CompositionIds.mjs";
const flag = (label, fallback = "", extra = {}) => ({
  label,
  fallback,
  ...extra,
});
const boolean = (label, fallback = false) =>
  flag(label, fallback, { boolean: true });
const theme = flag("Video theme", "classic");
const frames = flag("Comma-separated frame numbers", "", {
  pattern: /^\d+(,\d+)*$/,
});
const port = (fallback) =>
  flag("Local server port", process.env.PORT ?? fallback, {
    integer: [1, 65535],
    environment: "PORT",
    omit: true,
  });
const previewFlags = {
  "--title-offset": flag(
    "Title frame offset",
    process.env.TITLE_OFFSET ?? "66",
    { integer: [0], environment: "TITLE_OFFSET", omit: true },
  ),
  "--settle": flag("Settled frame offset", process.env.SETTLE ?? "12", {
    integer: [0],
    environment: "SETTLE",
    omit: true,
  }),
};
const renderFlags = {
  "--ffmpeg-bin": flag(
    "FFmpeg executable (empty uses pinned binary or PATH)",
    process.env.FFMPEG_BIN ?? "",
    { environment: "FFMPEG_BIN", omit: true },
  ),
  "--deliver": flag(
    "Delivery width:height",
    process.env.DELIVER ?? "1536:960",
    { pattern: /^\d+:\d+$/, environment: "DELIVER", omit: true },
  ),
  "--output-dir": flag(
    "Output directory",
    process.env.RENDER_OUT_DIR ?? "out",
    { environment: "RENDER_OUT_DIR", omit: true },
  ),
  "--output-id": flag(
    "Output filename identifier",
    process.env.RENDER_OUTPUT_ID ?? "",
    {
      // The final assertion also rejects a trailing line terminator.
      pattern: /^[a-zA-Z0-9_-]+$(?![\s\S])/,
      environment: "RENDER_OUTPUT_ID",
      omit: true,
      validateInherited: true,
    },
  ),
  "--standalone": boolean(
    "Skip the loop seam check",
    process.env.STANDALONE === "1",
  ),
  "--declared-cuts": frames,
  "--keep-frames": boolean(
    "Keep rendered source frames",
    process.env.KEEP_RENDER_FRAMES === "1",
  ),
};

/**
 * Public argument and full-wizard fields, shared by package and direct
 * entrypoints.
 */
export const CommandSchemas = {
  studio: { forward: true },
  "studio:licensed": { forward: true },
  test: { forward: true },
  typecheck: { forward: true },
  adopt: {
    maximum: 1,
    positional: "Stylesheet path (empty searches conventional paths)",
    flags: {
      "--mode": flag("Palette", "auto", { values: ["auto", "dark", "light"] }),
      "--curves": boolean("Copy easing curves"),
      "--dry-run": boolean("Report without writing"),
    },
  },
  preview: {
    maximum: Infinity,
    positional: "Body frames, separated by spaces (empty derives beats)",
    flags: {
      ...previewFlags,
      "--composition": flag("Composition identifier", "demo", {
        omit: true,
        pattern: CompositionIds.pattern,
      }),
    },
  },
  render: {
    maximum: 1,
    positional: "Poster frame",
    fallback: "366",
    positionalPattern: /^\d+$/,
    flags: {
      ...renderFlags,
      "--composition": flag("Composition identifier", "demo", {
        omit: true,
        pattern: CompositionIds.pattern,
      }),
    },
  },
  check: {
    maximum: 1,
    positional: "Video file",
    fallback: "out/demo.mp4",
    flags: {
      "--standalone": boolean("Skip the loop seam check"),
      "--declared-cuts": frames,
    },
  },
  showcase: { flags: { "--port": port("4173") } },
  "component:review": {
    flags: {
      "--build-only": boolean("Build without starting the server"),
      "--port": port("4175"),
    },
  },
  "component:build": {
    flags: { "--watch": boolean("Watch product source after building") },
  },
  "component:watch": { flags: {} },
  "component:measure": {
    flags: {
      "--url": flag("Local review URL", "http://localhost:4175"),
      "--output": flag(
        "Cursor target output",
        "src/avandar/cursor-targets.json",
      ),
      "--report-dir": flag(
        "Measurement evidence directory",
        "out/component-review/measurement",
      ),
      "--settle-ms": flag("Settling delay in milliseconds", "700", {
        integer: [100, 2000],
      }),
      "--features": flag("Comma-separated feature IDs (empty selects all)"),
      "--skip-determinism": boolean("Skip repeat measurement comparison"),
    },
  },
  "component:deliver": {
    maximum: Infinity,
    positional: "Film IDs, separated by spaces (empty selects all six)",
  },
  "atlas:posters": {
    maximum: Infinity,
    positional: "Composition IDs, separated by spaces (empty selects all)",
    flags: { "--theme": theme },
  },
  "theme:parity": {
    actions: ["capture", "compare"],
    maximum: Infinity,
    positional:
      "Target IDs, separated by spaces (empty selects fast base targets)",
    flags: { "--all": boolean("Select every target"), "--theme": theme },
  },
  "video:new": {
    minimum: 1,
    maximum: 1,
    positional: "Project name",
    positionalPattern: /^[a-z][a-z0-9-]*$/,
  },
  "capture:curate": {
    minimum: 1,
    maximum: 1,
    positional: "Passed capture run directory",
    flags: { "--replace": boolean("Replace existing curated assets") },
  },
  capture: {
    maximum: Infinity,
    positional: "Search words for the flow inventory",
    flags: {
      "--flows": flag(
        "Comma-separated flow IDs",
        "import,explorer,dashboards,cases,map",
      ),
      "--base-url": flag("Local application URL", "http://localhost:5173"),
      "--workspace": flag("Workspace slug", "avandar-labs"),
      "--run-label": flag("Run label", "harborfield"),
      "--fixture-dir": flag("Fixture directory", "demo-data"),
      "--root": flag("Producer directory", "."),
      "--list": boolean("List flows without recording"),
    },
  },
  motion: {
    actions: ["list", "preview", "render"],
    maximum: Infinity,
    positional: "Preset selection (all or preset ID)",
    fallback: "all",
    flags: {
      "--input": flag("Authored request JSON file (empty uses catalog input)"),
      "--theme": theme,
    },
  },
  video: {
    actions: ["validate", "plan", "preview", "render", "tts", "align"],
    minimum: 1,
    maximum: 1,
    positional: "Storyboard JSON file",
    flags: {},
    actionFlags: {
      preview: { "--theme": theme },
      render: { "--theme": theme },
      tts: {
        "--voice": flag("macOS voice (empty uses system voice)"),
        "--rate": flag("Words per minute", "175", { integer: [80, 240] }),
      },
      align: {
        "--audio": flag("Narration recording", "", { required: true }),
        "--srt": flag("Aligned SRT captions", "", { required: true }),
      },
    },
  },
  "data:generate": {
    flags: {
      "--check": boolean("Check regeneration without writing"),
      "--model": boolean("Print typed row JSON without writing"),
    },
  },
  "data:validate": { flags: {} },
  "motion:build": { flags: {} },
  "theme:sync-avandar": { flags: {} },
  "render:showcase": {
    flags: {
      "--preview-only": boolean(
        "Stop after previews",
        process.env.PREVIEW_ONLY === "1",
      ),
    },
  },
  "preview:showcase": { flags: {} },
  "add-sfx": {
    maximum: 1,
    positional: "Composition identifier",
    fallback: "demo",
    flags: {
      "--force": boolean(
        "Overwrite an existing sound pass",
        process.env.FORCE === "1",
      ),
      "--output-suffix": flag(
        "Sound output filename suffix",
        process.env.OUT_SUFFIX ?? "-sound",
        {
          environment: "OUT_SUFFIX",
          omit: true,
          pattern: /^[^/\\\u0000-\u001f]+$/u,
          validateInherited: true,
        },
      ),
      "--title-offset": previewFlags["--title-offset"],
    },
  },
};
