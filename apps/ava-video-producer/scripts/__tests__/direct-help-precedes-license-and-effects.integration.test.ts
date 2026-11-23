import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { LicenseFixtures } from "../../tests/LicenseFixtures";

const APP_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const TS_ENTRIES = [
  "adoptTheme/adoptTheme",
  "checkFrames",
  "showcase/server/server",
  "captureAvandar/captureAvandar",
  "video/video",
  "curateCapture/curateCapture",
  "buildProduct/buildProduct",
  "reviewAvandar",
  "showcase/atlasPosters/renderAtlasPosters",
  "videoTheme/themeParity/themeParity",
  "videoTheme/syncAvandarTheme/syncAvandarTheme",
  "showcase/buildShowcaseCli",
  "motion/motion",
  "measureAvandar/measureAvandar",
  "deliverAvandar",
  "newVideo",
  "testing/runProducerTests",
];
const COMMANDS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ...TS_ENTRIES.map((entry) => {
    return [
      process.execPath,
      [
        "--import",
        "tsx",
        "--import",
        "./scripts/yaml/registerYaml.ts",
        `scripts/${entry}.ts`,
      ],
    ] as const;
  }),
  ...["preview", "render", "render-showcase", "studio", "add-sfx"].map(
    (entry) => {
      return ["sh", [`scripts/${entry}.sh`]] as const;
    },
  ),
  ...["generate", "validate"].map((entry) => {
    return ["python3", [`demo-data/${entry}.py`]] as const;
  }),
];

test("every supported native entrypoint prints help before invalid arguments and credential reads", async (context) => {
  for (const [program, arguments_] of COMMANDS) {
    await context.test(arguments_.join(" "), () => {
      const result = spawnSync(
        program,
        [...arguments_, "--unknown", "missing-file", "-h"],
        {
          cwd: APP_ROOT,
          env: LicenseFixtures.licenseTestEnvironment("/dev/null"),
          encoding: "utf8",
          timeout: 10000,
        },
      );
      assert.equal(result.error, undefined);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stderr, "");
      assert.match(result.stdout, /Usage:/);
      assert.match(result.stdout, /Examples?:/);
      assert.match(result.stdout, /--help/);
    });
  }
});
