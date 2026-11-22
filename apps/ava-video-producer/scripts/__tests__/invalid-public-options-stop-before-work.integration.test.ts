import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { LicenseFixtures } from "../../tests/LicenseFixtures";

const APP_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const INVALID_INVOCATIONS = [
  ["video"],
  ["video:new"],
  ["capture:curate"],
  ["theme:parity"],
  ["adopt", "--unknown"],
  ["adopt", "one.css", "two.css"],
  ["adopt", "--mode", "light", "--mode", "dark"],
  ["component:review", "--unknown"],
  ["component:measure", "--settle-ms"],
  [
    "component:measure",
    "--url",
    "http://localhost:4175",
    "--url",
    "http://localhost:4176",
  ],
  ["theme:parity", "capture", "--theme"],
  ["theme:parity", "capture", "--theme", "classic", "--theme", "avandar"],
  ["check", "one.mp4", "two.mp4"],
  ["render", "1", "ignored"],
  ["showcase", "--unknown"],
  ["motion:build", "--unknown"],
  ["theme:sync-avandar", "--unknown"],
  ["data:validate", "--unknown"],
  ["data:generate", "--check", "--model"],
];

test("invalid public options fail with complete usage and recovery before reading license configuration", async (context) => {
  for (const [command, ...arguments_] of INVALID_INVOCATIONS) {
    await context.test([command, ...arguments_].join(" "), () => {
      const result = spawnSync(
        "npm",
        ["run", "--silent", command, "--", ...arguments_],
        {
          cwd: APP_ROOT,
          env: LicenseFixtures.licenseTestEnvironment("/dev/null"),
          encoding: "utf8",
          timeout: 10000,
        },
      );
      assert.equal(result.error, undefined);
      assert.notEqual(result.status, 0);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /Usage:/);
      assert.match(result.stderr, /Examples?:/);
      assert.match(result.stderr, /❌/);
      assert.match(result.stderr, /\n {2}⚠️/);
      assert.doesNotMatch(result.stderr, /Remotion license keys are required/);
      assert.equal(
        result.stderr.includes(String.fromCharCode(27) + "["),
        false,
      );
    });
  }
});
