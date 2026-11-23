/** License checks run before commands can start browsers or write outputs. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { LICENSE_FIXTURE, LicenseFixtures } from "../../tests/LicenseFixtures";
import { getRemotionLicenseFromAppRoot } from "../lib/getRemotionLicenseFromAppRoot";
import { requireLicense } from "../requireLicense";
import { ProducerLicenseEntryPoints } from "./ProducerLicenseEntryPoints";
import { StudioLicenseTestHelpers } from "./StudioLicenseTestHelpers/StudioLicenseTestHelpers";

const APP_ROOT = fileURLToPath(new URL("../../", import.meta.url));
/** Arguments that exercise each command's licensed work path. */
const PRODUCER_LICENSE_WORK_ARGUMENTS: Readonly<
  Record<string, readonly string[]>
> = {
  video: ["validate", "storyboards/library.json"],
  "video:new": ["license-check-project"],
  "capture:curate": ["out/captures/license-check"],
  "theme:parity": ["capture"],
};

test("the direct video command prints help before reading license keys", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "producer-license-"));
  try {
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--import",
        "./scripts/yaml/registerYaml.ts",
        "scripts/video/video.ts",
        "--help",
      ],
      {
        cwd: APP_ROOT,
        env: LicenseFixtures.licenseTestEnvironment(
          path.join(directory, ".env.local"),
        ),
        encoding: "utf8",
        timeout: 10000,
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /Usage:/);
    assert.match(result.stdout, /Examples:/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("raw Remotion commands refuse to start without license keys", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "producer-license-"));
  try {
    const result = spawnSync("pnpm", ["exec", "remotion", "compositions"], {
      cwd: APP_ROOT,
      env: LicenseFixtures.licenseTestEnvironment(
        path.join(directory, ".env.local"),
      ),
      encoding: "utf8",
      timeout: 10000,
    });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /Remotion license keys are required/);
    assert.doesNotMatch(result.stderr, /WARNING|TypeError/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("dotenv loading returns only the key pair without changing process.env", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "producer-license-"));
  try {
    await writeFile(
      path.join(directory, ".env.local"),
      LicenseFixtures.makeFixtureFromDirectory(),
    );
    const environmentBefore = createHash("sha256")
      .update(JSON.stringify(process.env))
      .digest("hex");
    assert.deepEqual(
      getRemotionLicenseFromAppRoot({
        appRoot: directory,
        environment: {},
      }),
      {
        publicKey: LICENSE_FIXTURE.publicKey,
        privateKey: LICENSE_FIXTURE.privateKey,
      },
    );
    assert.equal(
      createHash("sha256").update(JSON.stringify(process.env)).digest("hex"),
      environmentBefore,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("Studio exposes only the public key from files and inherited environment", async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), "producer-license-"));
  try {
    await writeFile(
      path.join(directory, "keys.env"),
      LicenseFixtures.makeFixtureFromDirectory(),
    );
    for (const source of ["file", "environment"]) {
      await context.test(source, () => {
        return StudioLicenseTestHelpers.assertEnvironment({
          directory,
          source,
        });
      });
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("direct exports with missing keys create no output directory", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "producer-license-"));
  const id = randomUUID();
  const output = path.join(APP_ROOT, "out/showcase/exports", id);
  try {
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--import",
        "./scripts/yaml/registerYaml.ts",
        "--input-type=module",
        "-e",
        `
      const {renderFilm} = await import("./scripts/showcase/renderFilm.ts");
      await renderFilm({ film: {}, id: ${JSON.stringify(id)}, progress: () => {} });
    `,
      ],
      {
        cwd: APP_ROOT,
        env: LicenseFixtures.licenseTestEnvironment(
          path.join(directory, ".env.local"),
        ),
        encoding: "utf8",
        timeout: 10000,
      },
    );
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /Remotion license keys are required/);
    assert.equal(existsSync(output), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
    await rm(output, { recursive: true, force: true });
  }
});
test("process keys override the key file without changing it", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "producer-license-"));
  const filename = path.join(directory, ".env.local");
  try {
    await writeFile(filename, LicenseFixtures.makeFixtureFromDirectory());
    assert.deepEqual(
      getRemotionLicenseFromAppRoot({
        appRoot: directory,
        environment: {
          REMOTION_PUBLIC_KEY: "rm_pub_ciFixture",
          REMOTION_PRIVATE_KEY: "rm_priv_ciFixture",
        },
      }),
      { publicKey: "rm_pub_ciFixture", privateKey: "rm_priv_ciFixture" },
    );
    assert.equal(
      await readFile(filename, "utf8"),
      LicenseFixtures.makeFixtureFromDirectory(),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("missing, blank, swapped, and free-license keys fail without disclosing values", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "producer-license-"));
  try {
    const invalidPairs = [
      {},
      { REMOTION_PUBLIC_KEY: LICENSE_FIXTURE.publicKey },
      { REMOTION_PRIVATE_KEY: LICENSE_FIXTURE.privateKey },
      {
        REMOTION_PUBLIC_KEY: "  ",
        REMOTION_PRIVATE_KEY: LICENSE_FIXTURE.privateKey,
      },
      {
        REMOTION_PUBLIC_KEY: LICENSE_FIXTURE.privateKey,
        REMOTION_PRIVATE_KEY: LICENSE_FIXTURE.publicKey,
      },
      {
        REMOTION_PUBLIC_KEY: "free-license",
        REMOTION_PRIVATE_KEY: "free-license",
      },
      {
        REMOTION_PUBLIC_KEY: LICENSE_FIXTURE.publicKey,
        REMOTION_PRIVATE_KEY: "free-license",
      },
    ];
    invalidPairs.forEach((environment) => {
      assert.throws(
        () => {
          return getRemotionLicenseFromAppRoot({
            appRoot: directory,
            environment,
          });
        },
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.match(error.message, /Remotion license keys are required/);
          assert.ok(!error.message.includes(LICENSE_FIXTURE.privateKey));
          assert.ok(!error.message.includes(LICENSE_FIXTURE.publicKey));
          return true;
        },
      );
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("an explicit key file works outside the app without loading unrelated variables", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "producer-license-"));
  try {
    const filename = path.join(directory, "keys.env");
    await writeFile(filename, LicenseFixtures.makeFixtureFromDirectory());
    const result = spawnSync(
      process.execPath,
      [
        // The command runs outside the app, so load tsx by its resolved URL.
        "--import",
        import.meta.resolve("tsx"),
        "--input-type=module",
        "-e",
        `await import(${JSON.stringify(new URL("../requireLicense.ts", import.meta.url).href)}).then(({ requireLicense }) => {
        requireLicense();
        if (process.env.REMOTION_PRIVATE_KEY || process.env.PRODUCER_UNRELATED_SECRET) process.exit(2);
        console.log("licensed");
      });`,
      ],
      {
        cwd: directory,
        env: LicenseFixtures.licenseTestEnvironment(filename),
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "licensed\n");
    assert.equal(result.stderr, "");
    assert.equal(
      requireLicense({ REMOTION_KEYS_FILE: filename }).publicKey,
      LICENSE_FIXTURE.publicKey,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("every package command that starts work rejects missing license keys", async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), "producer-license-"));
  const manifest = JSON.parse(
    await readFile(path.join(APP_ROOT, "package.json"), "utf8"),
  );
  try {
    for (const [name, command] of Object.entries(manifest.scripts) as Array<
      [string, string]
    >) {
      if (["pretest", "pretypecheck"].includes(name)) {
        continue;
      }
      await context.test(command, () => {
        const result = spawnSync(
          "sh",
          [
            "-c",
            `${command} "$@"`,
            "producer-license-work",
            ...(PRODUCER_LICENSE_WORK_ARGUMENTS[name] ?? []),
          ],
          {
            cwd: APP_ROOT,
            env: LicenseFixtures.licenseTestEnvironment(
              path.join(directory, ".env.local"),
            ),
            encoding: "utf8",
            timeout: 10000,
          },
        );
        assert.equal(result.status, 1, result.stderr);
        assert.match(result.stderr, /Remotion license keys are required/);
        assert.equal(result.stdout, "");
      });
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("direct script entry points reject missing keys before doing work", async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), "producer-license-"));
  try {
    for (const [program, args] of ProducerLicenseEntryPoints.commands) {
      await context.test(args.join(" "), () => {
        const result = spawnSync(program, args, {
          cwd: APP_ROOT,
          env: LicenseFixtures.licenseTestEnvironment(
            path.join(directory, ".env.local"),
          ),
          encoding: "utf8",
          timeout: 10000,
        });
        assert.equal(result.status, 1, result.stderr);
        assert.match(result.stderr, /Remotion license keys are required/);
        assert.equal(result.stdout, "");
      });
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
