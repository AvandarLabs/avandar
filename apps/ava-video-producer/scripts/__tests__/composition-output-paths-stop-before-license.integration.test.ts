import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { LicenseFixtures } from "../../tests/LicenseFixtures";

const APP_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const RENDER_BOUNDARY_FIXTURE = `#!/bin/sh
case "$*" in
  *scripts/renderSequence.ts*)
    printf '%s\\n' "$4" "$5" > "$PRODUCER_RENDER_ARGUMENTS"
    exit 42
    ;;
  *) exec "$PRODUCER_REAL_NODE" "$@" ;;
esac
`;

function _getRenderArgumentsFromCommandKind(
  commandKind: string,
  compositionId: string,
): string[] {
  return commandKind === "native"
    ? [compositionId, "114"]
    : ["114", "--composition", compositionId];
}

function _runRenderCommand(
  commandKind: string,
  arguments_: readonly string[],
  environment: Readonly<NodeJS.ProcessEnv>,
): SpawnSyncReturns<string> {
  const commandArguments =
    commandKind === "native"
      ? ["scripts/render.sh", ...arguments_]
      : [
          "scripts/runProducerCommand/runProducerCommand.mjs",
          "render",
          ...arguments_,
        ];
  return spawnSync(
    commandKind === "native" ? "sh" : process.execPath,
    commandArguments,
    {
      cwd: APP_ROOT,
      env: environment,
      encoding: "utf8",
      timeout: 10000,
    },
  );
}

async function _makeRenderEnvironmentFromDirectory(
  directory: string,
): Promise<NodeJS.ProcessEnv> {
  const keysFile = path.join(directory, "inert.keys");
  await writeFile(keysFile, LicenseFixtures.makeFixtureFromDirectory());
  await writeFile(path.join(directory, "node"), RENDER_BOUNDARY_FIXTURE, {
    mode: 0o755,
  });
  return {
    ...LicenseFixtures.licenseTestEnvironment(keysFile),
    PATH: `${directory}${path.delimiter}${process.env.PATH ?? ""}`,
    PRODUCER_REAL_NODE: process.execPath,
    PRODUCER_RENDER_ARGUMENTS: path.join(directory, "render-arguments.txt"),
  };
}

async function _getRenderArgumentsFromDirectory(
  directory: string,
): Promise<string[]> {
  const recordedArguments = await readFile(
    path.join(directory, "render-arguments.txt"),
    "utf8",
  );
  return recordedArguments.trimEnd().split("\n");
}

async function _assertRenderOutputPath(
  commandKind: string,
  source: string,
): Promise<void> {
  const directory = await mkdtemp(path.join(tmpdir(), "producer-render-id-"));
  try {
    const environment = await _makeRenderEnvironmentFromDirectory(directory);
    const outputArguments =
      source === "flag" ? ["--output-id", "film_2026"] : [];
    const result = _runRenderCommand(
      commandKind,
      [
        ..._getRenderArgumentsFromCommandKind(commandKind, "影片-2026"),
        "--output-dir",
        path.join(directory, "my exports"),
        ...outputArguments,
      ],
      {
        ...environment,
        ...(source === "environment" ? { RENDER_OUTPUT_ID: "film_2026" } : {}),
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.status, 42, result.stderr);
    assert.equal(result.stdout, "");
    const outputFilename =
      source === "default" ? "影片-2026-frames" : "film_2026-frames";
    assert.deepEqual(await _getRenderArgumentsFromDirectory(directory), [
      "影片-2026",
      path.join(directory, "my exports", outputFilename),
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function _assertInvalidOutputId(
  commandKind: string,
  source: string,
  id: string,
): Promise<void> {
  const directory = await mkdtemp(path.join(tmpdir(), "producer-render-id-"));
  try {
    const outputDirectory = path.join(directory, "exports");
    const outputArguments = source === "flag" ? ["--output-id", id] : [];
    const result = _runRenderCommand(
      commandKind,
      [
        ..._getRenderArgumentsFromCommandKind(commandKind, "demo"),
        "--output-dir",
        outputDirectory,
        ...outputArguments,
      ],
      {
        ...LicenseFixtures.licenseTestEnvironment("/dev/null"),
        ...(source === "environment" ? { RENDER_OUTPUT_ID: id } : {}),
      },
    );
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Invalid value for --output-id/);
    assert.match(result.stderr, /Usage:/);
    assert.doesNotMatch(result.stderr, /Remotion license keys are required/);
    assert.equal(existsSync(outputDirectory), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function _assertNoCompositionOutputs(id: string): void {
  for (const suffix of ["-frames", "-preview", "-sound.mp4"]) {
    assert.equal(
      existsSync(path.join(APP_ROOT, "out", `${id}${suffix}`)),
      false,
    );
  }
}

function _assertEarlyRejection(
  program: string,
  arguments_: readonly string[],
  environment: NodeJS.ProcessEnv = {},
): void {
  const result = spawnSync(program, arguments_, {
    cwd: APP_ROOT,
    env: {
      ...LicenseFixtures.licenseTestEnvironment("/dev/null"),
      ...environment,
    },
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /❌/);
  assert.match(result.stderr, /\n {2}⚠️/);
  assert.match(result.stderr, /Usage:/);
  assert.doesNotMatch(result.stderr, /Remotion license keys are required/);
}

test("unsafe composition IDs are rejected before credentials or derived output work", async (context) => {
  const prefix = `producer-cli-${randomUUID()}`;
  const ids = [
    `../${prefix}`,
    `/tmp/${prefix}`,
    `${prefix}/film`,
    `${prefix}\\film`,
    ".",
    "..",
    `${prefix}\n`,
    `${prefix}\r`,
    `${prefix}\u2028`,
    `${prefix}\u2029`,
  ];
  for (const id of ids) {
    for (const command of ["preview", "render"]) {
      await context.test(`${command} package ${id}`, () => {
        return _assertEarlyRejection("npm", [
          "run",
          "--silent",
          command,
          "--",
          "0",
          "--composition",
          id,
        ]);
      });
      await context.test(`${command} native ${id}`, () => {
        return _assertEarlyRejection("sh", [`scripts/${command}.sh`, id, "0"]);
      });
    }
    await context.test(`sound native ${id}`, () => {
      return _assertEarlyRejection("sh", ["scripts/add-sfx.sh", id]);
    });
    _assertNoCompositionOutputs(id);
  }
});

test("sound suffixes reject path separators from flags and legacy environment defaults", async (context) => {
  for (const suffix of ["/../../escape", "\\..\\escape"]) {
    await context.test(`flag ${suffix}`, () => {
      return _assertEarlyRejection("sh", [
        "scripts/add-sfx.sh",
        "demo",
        "--output-suffix",
        suffix,
      ]);
    });
    await context.test(`environment ${suffix}`, () => {
      return _assertEarlyRejection("sh", ["scripts/add-sfx.sh", "demo"], {
        OUT_SUFFIX: suffix,
      });
    });
  }
});

test("valid Remotion IDs preserve CJK and digits while explicit output directories keep spaces", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { parseCommandArguments } from "./scripts/runProducerCommand/parseCommandArguments.mjs";
    import { normalizeCommandArguments } from "./scripts/runProducerCommand/normalizeCommandArguments.mjs";
    const parsed = parseCommandArguments({commandName:"render",arguments:["114","--composition","影片-2026","--output-dir","out/my exports"]});
    console.log(JSON.stringify(normalizeCommandArguments({commandName:"render",parsed})));`,
    ],
    {
      cwd: APP_ROOT,
      env: LicenseFixtures.licenseTestEnvironment("/dev/null"),
      encoding: "utf8",
      timeout: 10000,
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    arguments: ["114"],
    environment: {
      AVA_PRODUCER_COMPOSITION: "影片-2026",
      RENDER_OUT_DIR: "out/my exports",
    },
  });
});

test("default CJK output IDs preserve their complete filenames through the shell guard", async (context) => {
  for (const commandKind of ["package", "native"]) {
    await context.test(commandKind, () => {
      return _assertRenderOutputPath(commandKind, "default");
    });
  }
});

test("explicit ASCII output IDs preserve underscores for CJK compositions", async (context) => {
  for (const commandKind of ["package", "native"]) {
    for (const source of ["flag", "environment"]) {
      await context.test(`${commandKind} ${source}`, () => {
        return _assertRenderOutputPath(commandKind, source);
      });
    }
  }
});

test("invalid explicit output IDs fail before credentials or output directories", async (context) => {
  for (const commandKind of ["package", "native"]) {
    for (const source of ["flag", "environment"]) {
      for (const id of [
        "../escape",
        "film/escape",
        "film\\escape",
        "影片-2026",
        "film name",
        "film\n",
        "film\r",
        "film\u2028",
        "film\u2029",
      ]) {
        await context.test(`${commandKind} ${source} ${id}`, () => {
          return _assertInvalidOutputId(commandKind, source, id);
        });
      }
    }
  }
});
