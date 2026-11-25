/**
 * Every direct script entry point the license guard must stop, as the program
 * and arguments that start it.
 */
const COMMANDS: ReadonlyArray<readonly [string, readonly string[]]> = [
  [
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      "./scripts/yaml/registerYaml.ts",
      "scripts/showcase/server/server.ts",
    ],
  ],
  [
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      "./scripts/yaml/registerYaml.ts",
      "scripts/motion/motion.ts",
      "list",
    ],
  ],
  [
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      "./scripts/yaml/registerYaml.ts",
      "scripts/showcase/buildShowcaseCli.ts",
    ],
  ],
  ...[
    "buildProduct/buildProduct",
    "reviewAvandar",
    "renderSequence",
    "measureAvandar/measureAvandar",
    "deliverAvandar",
    "newVideo",
    "adoptTheme/adoptTheme",
    "checkFrames",
    "curateCapture/curateCapture",
    "captureAvandar/captureAvandar",
  ].map((name) => {
    return [
      process.execPath,
      [
        "--import",
        "tsx",
        `scripts/${name}.ts`,
        ...(name === "newVideo"
          ? ["license-check-project"]
          : name === "curateCapture/curateCapture"
            ? ["out/captures/license-check"]
            : []),
      ],
    ] as const;
  }),
  [
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      "./scripts/yaml/registerYaml.ts",
      "scripts/readTheme.ts",
    ],
  ],
  ...["studio", "preview", "render", "render-showcase", "add-sfx"].map(
    (name) => {
      return ["sh", [`scripts/${name}.sh`]] as const;
    },
  ),
  ...["generate", "validate"].map((name) => {
    return ["python3", [`demo-data/${name}.py`]] as const;
  }),
];
/** Script entry points whose work paths require a producer license. */
export const ProducerLicenseEntryPoints = {
  /** Programs and arguments checked before browsers or outputs can start. */
  commands: COMMANDS,
};
