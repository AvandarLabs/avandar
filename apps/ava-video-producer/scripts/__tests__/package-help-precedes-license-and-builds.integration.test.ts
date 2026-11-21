import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { LICENSE_FIXTURE, LicenseFixtures } from "../../tests/LicenseFixtures";

const APP_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const EFFECT_GUARD = `
import fs from "node:fs";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import path from "node:path";
const entryPoint = process.argv[1] ? fs.realpathSync(process.argv[1]) : "";
if (path.basename(entryPoint) !== "npm-cli.js") {
  const writeMarker = fs.writeFileSync;
  const rejectEffect = () => {
    writeMarker(process.env.PRODUCER_HELP_EFFECT_MARKER, "work started");
    throw new Error("Help started a subprocess or wrote a file");
  };
  for (const name of ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"]) {
    childProcess[name] = rejectEffect;
  }
  for (const name of ["writeFile", "writeFileSync", "copyFile", "copyFileSync", "mkdir", "mkdirSync", "rename", "renameSync", "rm", "rmSync"]) {
    fs[name] = rejectEffect;
  }
  for (const name of ["writeFile", "copyFile", "mkdir", "rename", "rm"]) {
    fs.promises[name] = rejectEffect;
  }
  syncBuiltinESMExports();
}
`;

function _runPackageCommand(
  options: Readonly<{
    command: string;
    arguments: readonly string[];
    environment?: Readonly<NodeJS.ProcessEnv>;
  }>,
): SpawnSyncReturns<string> {
  return spawnSync(
    "npm",
    ["run", "--silent", options.command, "--", ...options.arguments],
    {
      cwd: APP_ROOT,
      env: {
        ...LicenseFixtures.licenseTestEnvironment("/dev/null"),
        ...options.environment,
      },
      encoding: "utf8",
      timeout: 10000,
    },
  );
}

function _assertHelp(result: Readonly<SpawnSyncReturns<string>>): void {
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /Usage:/i);
  assert.match(result.stdout, /Examples?:/i);
  assert.match(result.stdout, /--help/);
  assert.doesNotMatch(result.stdout, /Remotion license keys are required/);
}

test("every public package command prints help without license keys", async (context) => {
  const manifest: { scripts: Record<string, string> } = JSON.parse(
    await readFile(path.join(APP_ROOT, "package.json"), "utf8"),
  );
  for (const command of Object.keys(manifest.scripts)) {
    await context.test(command, () => {
      _assertHelp(_runPackageCommand({ command, arguments: ["--help"] }));
    });
  }
});

test("help wins over invalid arguments in every argv position", async (context) => {
  for (const arguments_ of [
    ["--help", "invalid-command", "--unknown"],
    ["invalid-command", "-h", "--unknown"],
    ["invalid-command", "--unknown", "--help"],
  ]) {
    await context.test(arguments_.join(" "), () => {
      _assertHelp(
        _runPackageCommand({ command: "video", arguments: arguments_ }),
      );
    });
  }
});

test("video render help describes only its own plan and theme options", () => {
  const result = _runPackageCommand({
    command: "video",
    arguments: [
      "render",
      "missing-storyboard.json",
      "--theme",
      "missing-theme.json",
      "-h",
    ],
  });
  _assertHelp(result);
  assert.match(result.stdout, /video render <[^>]+>/);
  assert.match(result.stdout, /--theme/);
  assert.match(result.stdout, /default/i);
  assert.doesNotMatch(result.stdout, /--voice|--rate|--audio|--srt/);
});

test("test and typecheck help starts no build or child command with valid inert keys", async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), "producer-help-"));
  const guard = path.join(directory, "effect-guard.mjs");
  await writeFile(guard, EFFECT_GUARD);
  try {
    for (const command of ["test", "typecheck", "pretest", "pretypecheck"]) {
      await context.test(command, () => {
        const marker = path.join(directory, `${command}-side-effect.txt`);
        const result = _runPackageCommand({
          command,
          arguments: ["--unknown", "-h"],
          environment: {
            REMOTION_PUBLIC_KEY: LICENSE_FIXTURE.publicKey,
            REMOTION_PRIVATE_KEY: LICENSE_FIXTURE.privateKey,
            PRODUCER_HELP_EFFECT_MARKER: marker,
            NODE_OPTIONS: `--import=${pathToFileURL(guard).href}`,
          },
        });
        assert.equal(existsSync(marker), false, result.stderr);
        _assertHelp(result);
      });
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("real package work still fails with missing license keys", async (context) => {
  for (const command of ["video", "component:build", "test", "typecheck"]) {
    await context.test(command, () => {
      const result = _runPackageCommand({
        command,
        arguments:
          command === "video" ? ["validate", "storyboards/library.json"] : [],
      });
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /Remotion license keys are required/);
      assert.equal(result.stdout, "");
    });
  }
});

test("help text remains complete when ignored invalid credential values overlap ordinary words", () => {
  _assertHelp(
    _runPackageCommand({
      command: "video",
      arguments: ["render", "--help"],
      environment: { REMOTION_PUBLIC_KEY: "p", REMOTION_PRIVATE_KEY: "a" },
    }),
  );
});
