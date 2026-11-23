/** Static help and execution contracts for this producer command family. */
export const PIPELINE_COMMANDS = {
  video: {
    purpose: "Validate, plan, preview, render, or narrate a storyboard.",
    synopsis: "<command> <plan.json> [options]",
    details: [
      "Commands: validate, plan, preview, render, tts, align.",
      "Use pnpm video <command> --help for the complete options for that stage.",
    ],
    examples: [
      "pnpm video validate storyboards/library.json",
      "pnpm video preview storyboards/library.json --theme classic",
    ],
    command:
      "node --import tsx scripts/requireLicense.ts && node --import tsx --import ./scripts/yaml/registerYaml.ts scripts/video/video.ts",
    subcommands: {
      validate: {
        purpose: "Check storyboard schema, assets, and media timing.",
        synopsis: "<plan.json>",
        details: [
          "plan.json: required storyboard path. Source plans are never edited in place.",
          "Outputs: out/<id>/ in the plan workspace. Replaced outputs move to .history/.",
        ],
        examples: [
          "pnpm video validate storyboards/library.json",
          "pnpm video validate ../../.videos/product/storyboard.json",
        ],
      },
      plan: {
        purpose: "Write the shot list, transcript, SRT, and VTT.",
        synopsis: "<plan.json>",
        details: [
          "plan.json: required storyboard path. Source plans are never edited in place.",
          "Outputs: out/<id>/ in the plan workspace. Replaced outputs move to .history/.",
        ],
        examples: [
          "pnpm video plan storyboards/library.json",
          "pnpm video plan ../../.videos/product/storyboard.json",
        ],
      },
      preview: {
        purpose: "Render composed-film stills and a contact sheet.",
        synopsis: "<plan.json> [--theme id]",
        details: [
          "plan.json: required storyboard path. Source plans are never edited in place.",
          "Outputs: out/<id>/ in the plan workspace. Replaced outputs move to .history/.",
          "--theme id: installed video theme identifier. Default: classic.",
          "Product components rebuild automatically when the storyboard needs them.",
        ],
        examples: [
          "pnpm video preview storyboards/library.json",
          "pnpm video preview storyboards/library.json --theme avandar",
        ],
      },
      render: {
        purpose:
          "Require a matching preview, render and gate the film, then mix audio.",
        synopsis: "<plan.json> [--theme id]",
        details: [
          "plan.json: required storyboard path. Source plans are never edited in place.",
          "Outputs: out/<id>/ in the plan workspace. Replaced outputs move to .history/.",
          "--theme id: installed video theme identifier. Default: classic.",
          "Product components rebuild automatically when the storyboard needs them.",
          "A matching inspected preview fingerprint is required before rendering.",
        ],
        examples: [
          "pnpm video render storyboards/library.json",
          "pnpm video render storyboards/library.json --theme avandar",
        ],
      },
      tts: {
        purpose: "Generate macOS scratch narration and a derived storyboard.",
        synopsis: "<plan.json> [--voice name] [--rate words-per-minute]",
        details: [
          "plan.json: required storyboard path. Source plans are never edited in place.",
          "Outputs: out/<id>/ in the plan workspace. Replaced outputs move to .history/.",
          "--voice name: macOS say voice. Default: system voice.",
          "--rate words-per-minute: integer from 80 to 240. Default: 175.",
          "Generated speech is scratch narration, not final voice performance.",
        ],
        examples: [
          "pnpm video tts storyboards/library.json",
          "pnpm video tts storyboards/library.json --voice Samantha --rate 160",
        ],
      },
      align: {
        purpose: "Import a recording with manually aligned SRT timings.",
        synopsis: "<plan.json> --audio file --srt file",
        details: [
          "plan.json: required storyboard path. Source plans are never edited in place.",
          "Outputs: out/<id>/ in the plan workspace. Replaced outputs move to .history/.",
          "--audio file: required provided recording.",
          "--srt file: required manually aligned captions. This imports timings, not speech recognition.",
        ],
        examples: [
          "pnpm video align storyboards/library.json --audio narration.wav --srt captions.srt",
          "pnpm video align ../../.videos/product/storyboard.json --audio narration.wav --srt captions.srt",
        ],
      },
    },
  },
  motion: {
    purpose: "List, preview, or render Motion Atlas presets.",
    synopsis: "<list|preview|render> [all|preset-id] [options]",
    details: [
      "Commands: list, preview, render. Default selection: all.",
      "Use pnpm motion <command> --help for complete command options.",
    ],
    examples: ["pnpm motion list", "pnpm motion preview all"],
    command:
      "node --import tsx scripts/requireLicense.ts && node --import tsx --import ./scripts/yaml/registerYaml.ts scripts/motion/motion.ts",
    subcommands: {
      list: {
        purpose: "List the Motion Atlas preset selections.",
        synopsis: "[search-word...]",
        details: [
          "Every search word narrows known preset IDs, names and category groups, case-insensitively.",
          "Bare motion and motion list share this inventory. On terminals, unfiltered results open a searchable view; Return displays details only.",
          "Filtered/piped output is tab-separated ID, category and name. Zero matches exits 1.",
        ],
        examples: ["pnpm motion list", "pnpm motion list school cost"],
      },
      preview: {
        purpose: "Render Motion Atlas preview frames and contact sheets.",
        synopsis: "[all|preset-id] [--input file.json] [--theme id]",
        details: [
          "Selection: all or a stable preset ID. Default: all.",
          "--input file.json: complete authored request for one selected preset. Default: catalog input. Cannot be used with all.",
          "--theme id: installed video theme identifier. Default: classic.",
        ],
        examples: [
          "pnpm motion preview all",
          "pnpm motion preview school-cost-satchel --theme classic",
        ],
      },
      render: {
        purpose: "Render and gate Motion Atlas exports serially.",
        synopsis: "[all|preset-id] [--input file.json] [--theme id]",
        details: [
          "Selection: all or a stable preset ID. Default: all.",
          "--input file.json: complete authored request for one selected preset. Default: catalog input. Cannot be used with all.",
          "--theme id: installed video theme identifier. Default: classic.",
          "Matching previews are required. Deliveries use out/motion/deliveries/.",
        ],
        examples: [
          "pnpm motion render all",
          "pnpm motion render school-cost-satchel --input request.json",
        ],
      },
    },
  },
  "theme:parity": {
    purpose: "Capture or compare theme parity reference frames.",
    synopsis: "<capture|compare> [target-id...|--all] [--theme id]",
    details: [
      "Commands: capture, compare. Default target selection: fast base list.",
      "Use pnpm theme:parity <command> --help for complete command options.",
    ],
    examples: [
      "pnpm theme:parity capture",
      "pnpm theme:parity compare --all --theme classic",
    ],
    command:
      "node --import tsx scripts/requireLicense.ts && node --import tsx --import ./scripts/yaml/registerYaml.ts scripts/videoTheme/themeParity/themeParity.ts",
    subcommands: {
      capture: {
        purpose: "Capture the reference frames for theme parity.",
        synopsis: "[target-id...|--all] [--theme id]",
        details: [
          "target-id: Atlas target identifiers. Default: the fast base target list.",
          "--all: select every available parity target. Default: false.",
          "--theme id: installed video theme identifier. Default: classic.",
          "Outputs: out/theme-parity/; non-classic themes use a theme subdirectory.",
        ],
        examples: [
          "pnpm theme:parity capture",
          "pnpm theme:parity capture --all --theme avandar",
        ],
      },
      compare: {
        purpose: "Compare current theme frames against captured references.",
        synopsis: "[target-id...|--all] [--theme id]",
        details: [
          "target-id: Atlas target identifiers. Default: the fast base target list.",
          "--all: select every available parity target. Default: false.",
          "--theme id: installed video theme identifier. Default: classic.",
          "Outputs: out/theme-parity/; non-classic themes use a theme subdirectory.",
        ],
        examples: [
          "pnpm theme:parity compare",
          "pnpm theme:parity compare --all --theme avandar",
        ],
      },
    },
  },
  "video:new": {
    purpose:
      "Create an ignored private video project under the workspace .videos directory.",
    synopsis: "<project-name>",
    details: [
      "project-name: required lowercase letters, digits, and hyphens; must start with a letter.",
      "Creates storyboard.json and public/. Existing projects are not overwritten.",
    ],
    examples: ["pnpm video:new product-tour", "pnpm video:new feature-demo"],
    command:
      "node --import tsx scripts/requireLicense.ts && node --import tsx scripts/newVideo.ts",
  },
  showcase: {
    purpose: "Serve and watch the live Motion Atlas and sample-film gallery.",
    synopsis: "[--port number]",
    details: [
      "--port number: integer 1 to 65535. Default: PORT or 4173. The server binds only 127.0.0.1.",
      "Builds browser previews from current source. MP4 generation requires an explicit download request.",
    ],
    examples: ["pnpm showcase", "pnpm showcase --port 4174"],
    command:
      "node --import tsx scripts/requireLicense.ts && node --import tsx --import ./scripts/yaml/registerYaml.ts scripts/showcase/server/server.ts",
  },
  "motion:build": {
    purpose: "Build product components and every showcase page.",
    synopsis: "",
    details: [
      "No command-specific arguments or options.",
      "Builds current worktree source and writes ignored showcase browser output.",
    ],
    examples: ["pnpm motion:build"],
    command:
      "node --import tsx scripts/requireLicense.ts && node --import tsx --import ./scripts/yaml/registerYaml.ts scripts/showcase/buildShowcaseCli.ts",
  },
  "atlas:posters": {
    purpose: "Render Composition and Sample film card posters.",
    synopsis: "[--theme id] [composition-id...]",
    details: [
      "composition-id: zero or more registered composition IDs. Default: all poster targets.",
      "--theme id: installed video theme identifier. Default: classic.",
    ],
    examples: [
      "pnpm atlas:posters",
      "pnpm atlas:posters --theme avandar shared-object-handoff",
    ],
    command:
      "node --import tsx scripts/requireLicense.ts && node --import tsx --import ./scripts/yaml/registerYaml.ts scripts/showcase/atlasPosters/renderAtlasPosters.ts",
  },
  "theme:sync-avandar": {
    purpose:
      "Regenerate the Avandar video theme from this worktree product theme.",
    synopsis: "",
    details: [
      "No command-specific arguments or options.",
      "Writes themes/avandar.theme.json from current product theme source.",
    ],
    examples: ["pnpm theme:sync-avandar"],
    command:
      "node --import tsx scripts/requireLicense.ts && node --import tsx scripts/videoTheme/syncAvandarTheme/syncAvandarTheme.ts",
  },
};
