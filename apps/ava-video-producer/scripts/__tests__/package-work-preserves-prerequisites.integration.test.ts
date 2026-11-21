import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { LICENSE_FIXTURE, LicenseFixtures } from "../../tests/LicenseFixtures";

const APP_ROOT = fileURLToPath(new URL("../../", import.meta.url));

function _runPackageCommand(
  options: Readonly<{
    command: string;
    environment: Readonly<NodeJS.ProcessEnv>;
  }>,
): SpawnSyncReturns<string> {
  return spawnSync("npm", ["run", "--silent", options.command], {
    cwd: APP_ROOT,
    env: {
      ...LicenseFixtures.licenseTestEnvironment("/dev/null"),
      ...options.environment,
    },
    encoding: "utf8",
    timeout: 10000,
  });
}

const COMMAND_FIXTURE = `#!/bin/sh
if [ "$(basename "$0")" = tsc ]; then
  printf 'typecheck\\n' >> "$PRODUCER_COMMAND_EVENTS"
  exit 0
fi
case "$*" in
  *typescript*/bin/tsc*|*typescript*/lib/tsc*|*node_modules/.bin/tsc*)
    printf 'typecheck\\n' >> "$PRODUCER_COMMAND_EVENTS"
    exit 0
    ;;
  *scripts/requireLicense.ts*)
    "$PRODUCER_REAL_NODE" "$@"
    license_status=$?
    if [ "$license_status" -eq 0 ]; then
      printf 'license\\n' >> "$PRODUCER_COMMAND_EVENTS"
    fi
    exit "$license_status"
    ;;
  *scripts/buildProduct/buildProduct.ts*)
    printf 'product-build\\n' >> "$PRODUCER_COMMAND_EVENTS"
    exit "$PRODUCER_BUILD_STATUS"
    ;;
  *scripts/showcase/buildShowcaseCli.ts*)
    printf 'showcase-build\\n' >> "$PRODUCER_COMMAND_EVENTS"
    exit "$PRODUCER_BUILD_STATUS"
    ;;
  *scripts/testing/runProducerTests.ts*)
    printf 'tests\\n' >> "$PRODUCER_COMMAND_EVENTS"
    exit 0
    ;;
  *) exec "$PRODUCER_REAL_NODE" "$@" ;;
esac
`;

async function _makeCommandFixtureEnvironmentFromDirectory(
  directory: string,
): Promise<NodeJS.ProcessEnv> {
  for (const executable of ["node", "tsc"]) {
    await writeFile(path.join(directory, executable), COMMAND_FIXTURE, {
      mode: 0o755,
    });
  }
  return {
    PATH: `${directory}${path.delimiter}${process.env.PATH ?? ""}`,
    PRODUCER_REAL_NODE: process.execPath,
    PRODUCER_COMMAND_EVENTS: path.join(directory, "events.txt"),
    PRODUCER_BUILD_STATUS: "0",
    REMOTION_PUBLIC_KEY: LICENSE_FIXTURE.publicKey,
    REMOTION_PRIVATE_KEY: LICENSE_FIXTURE.privateKey,
  };
}

test("real test and typecheck work runs the licensed prerequisite before its child runner", async (context) => {
  for (const command of ["test", "typecheck"]) {
    await context.test(command, async () => {
      const directory = await mkdtemp(path.join(tmpdir(), "producer-work-"));
      try {
        const environment =
          await _makeCommandFixtureEnvironmentFromDirectory(directory);
        const result = _runPackageCommand({ command, environment });
        assert.equal(result.status, 0, result.stderr);
        const events = (
          await readFile(path.join(directory, "events.txt"), "utf8")
        )
          .trim()
          .split("\n");
        assert.equal(events[0], "license");
        assert.deepEqual(
          events.filter((event) => {
            return event !== "license";
          }),
          command === "test"
            ? ["product-build", "tests"]
            : ["showcase-build", "typecheck", "typecheck"],
        );
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    });
  }
});

test("a failed test or typecheck prerequisite preserves its exit status and stops the runner", async (context) => {
  for (const command of ["test", "typecheck"]) {
    await context.test(command, async () => {
      const directory = await mkdtemp(path.join(tmpdir(), "producer-work-"));
      try {
        const environment =
          await _makeCommandFixtureEnvironmentFromDirectory(directory);
        const result = _runPackageCommand({
          command,
          environment: { ...environment, PRODUCER_BUILD_STATUS: "42" },
        });
        assert.equal(result.status, 42, result.stderr);
        const events = (
          await readFile(path.join(directory, "events.txt"), "utf8")
        )
          .trim()
          .split("\n");
        assert.equal(events[0], "license");
        assert.deepEqual(
          events.filter((event) => {
            return event !== "license";
          }),
          [command === "test" ? "product-build" : "showcase-build"],
        );
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    });
  }
});
