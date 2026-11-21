/** Static help and execution contracts for this producer command family. */
export const COMPONENT_COMMANDS = {
  "component:build": {
    purpose: "Compile product components from the current Avandar worktree.",
    synopsis: "[--watch]",
    details: [
      "--watch: rebuild after source changes. Default: build once.",
      "Outputs: ignored generated product bridge files. Product source is read-only.",
    ],
    examples: ["pnpm component:build", "pnpm component:build --watch"],
    command:
      "node --import tsx scripts/requireLicense.ts && node --import tsx scripts/buildProduct/buildProduct.ts",
  },
  "component:watch": {
    purpose: "Compile product components and watch their source for changes.",
    synopsis: "",
    details: [
      "No additional command-specific arguments or options.",
      "Equivalent to component:build --watch. Uses the current Avandar worktree.",
    ],
    examples: ["pnpm component:watch"],
    command:
      "node --import tsx scripts/requireLicense.ts && node --import tsx scripts/buildProduct/buildProduct.ts --watch",
  },
  "component:review": {
    purpose: "Build and watch the live product-component review timelines.",
    synopsis: "[--build-only] [--port number]",
    details: [
      "--build-only: build the review without opening a server or watcher. Default: serve and watch.",
      "--port number: integer 1 to 65535. Default: PORT or 4175. Output: out/component-review/.",
    ],
    examples: ["pnpm component:review", "pnpm component:review --build-only"],
    command:
      "node --import tsx scripts/requireLicense.ts && node --import tsx scripts/reviewAvandar.ts",
  },
  "component:measure": {
    purpose: "Measure product cursor targets from rendered browser frames.",
    synopsis:
      "[--url url] [--output file] [--report-dir directory] [--settle-ms milliseconds] [--features ids] [--skip-determinism]",
    details: [
      "--url url: review URL. Default: http://localhost:4175.",
      "--output file: cursor-target JSON output. Default: src/avandar/cursor-targets.json.",
      "--report-dir directory: measurement evidence directory. Default: out/component-review/measurement.",
      "--settle-ms milliseconds: integer from 100 to 2000. Default: 700.",
      "--features ids: comma-separated feature IDs. Default: all features; partial runs require explicit --output.",
      "--skip-determinism: omit the repeat measurement comparison. Default: check determinism.",
    ],
    examples: [
      "pnpm component:measure",
      "pnpm component:measure --features import --output out/import-targets.json",
    ],
    command:
      "node --import tsx scripts/requireLicense.ts && node --import tsx scripts/measureAvandar/measureAvandar.ts",
  },
  "component:deliver": {
    purpose:
      "Validate and deliver finished component films, posters, and captions.",
    synopsis: "[film-id...]",
    details: [
      "film-id: avandar-import, avandar-explorer, avandar-dashboards, avandar-cases, avandar-map, or avandar-overview. Default: all six.",
      "Requires completed renders with passing picture gates.",
      "Output: out/component-deliveries/. Existing deliveries are backed up.",
    ],
    examples: [
      "pnpm component:deliver",
      "pnpm component:deliver avandar-import avandar-explorer",
    ],
    command:
      "node --import tsx scripts/requireLicense.ts && node --import tsx scripts/deliverAvandar.ts",
  },
  capture: {
    purpose:
      "Record authorized local Avandar flows or list available capture flows.",
    synopsis:
      "[--flows ids] [--base-url url] [--workspace slug] [--run-label label] [--fixture-dir directory] [--root directory] [--list]",
    details: [
      "--flows ids: comma-separated import,explorer,dashboards,cases,map. Default: import,explorer,dashboards,cases,map.",
      "--base-url url: local application URL. Default: http://localhost:5173.",
      "--workspace slug: workspace slug. Default: avandar-labs.",
      "--run-label label: capture run label. Default: harborfield.",
      "--fixture-dir directory: fixture directory. Default: demo-data.",
      "--root directory: producer root. Default: current directory.",
      "--list: inspect flows without recording. capture list [words...] and capture [words...] share all-words, case-insensitive inventory filtering.",
      "Filtered/piped listings print tab-separated ID, group and name; zero matches exits 1. Unfiltered terminal Return displays details only.",
    ],
    examples: [
      "pnpm capture --list",
      "pnpm capture --flows import,explorer --base-url http://localhost:5173",
    ],
    command:
      "node --import tsx scripts/requireLicense.ts && node --import tsx scripts/captureAvandar/captureAvandar.ts",
  },
  "capture:curate": {
    purpose: "Curate sanitized assets from a successful capture run.",
    synopsis: "<run-directory> [--replace]",
    details: [
      "run-directory: required passed capture directory under out/captures/.",
      "--replace: replace existing curated assets. Default: refuse replacement.",
    ],
    examples: [
      "pnpm capture:curate out/captures/passed-run",
      "pnpm capture:curate out/captures/passed-run --replace",
    ],
    command:
      "node --import tsx scripts/requireLicense.ts && node --import tsx scripts/curateCapture/curateCapture.ts",
  },
};
