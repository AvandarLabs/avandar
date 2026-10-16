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
import { readLicense } from "../scripts/lib/readLicense.mjs";
import { requireLicense } from "../scripts/require-license.mjs";
import {
  buildLicenseFixture,
  LICENSE_FIXTURE,
  licenseTestEnvironment,
} from "./license-fixture";

const APP_ROOT = fileURLToPath(new URL("../", import.meta.url));

test("the direct video command refuses to start without license keys", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "producer-license-"));
  try {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/video.ts", "--help"],
      {
        cwd: APP_ROOT,
        env: licenseTestEnvironment(path.join(directory, ".env.local")),
        encoding: "utf8",
        timeout: 10_000,
      },
    );
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /Remotion license keys are required/);
    assert.match(result.stderr, /apps\/ava-video-producer\/\.env\.local/);
    assert.equal(result.stdout, "");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("raw Remotion commands refuse to start without license keys", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "producer-license-"));
  try {
    const result = spawnSync("pnpm", ["exec", "remotion", "compositions"], {
      cwd: APP_ROOT,
      env: licenseTestEnvironment(path.join(directory, ".env.local")),
      encoding: "utf8",
      timeout: 10_000,
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
    await writeFile(path.join(directory, ".env.local"), buildLicenseFixture());
    const environmentBefore = createHash("sha256")
      .update(JSON.stringify(process.env))
      .digest("hex");
    assert.deepEqual(readLicense(directory, {}), {
      publicKey: LICENSE_FIXTURE.publicKey,
      privateKey: LICENSE_FIXTURE.privateKey,
    });
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
  const filename = path.join(directory, "keys.env");
  try {
    await writeFile(filename, buildLicenseFixture());
    for (const source of ["file", "environment"]) {
      await context.test(source, () => {
        const environment = licenseTestEnvironment(filename);
        if (source === "environment") {
          environment.REMOTION_KEYS_FILE = path.join(directory, "missing.env");
          environment.REMOTION_PUBLIC_KEY = LICENSE_FIXTURE.publicKey;
          environment.REMOTION_PRIVATE_KEY = LICENSE_FIXTURE.privateKey;
          environment.REMOTION_PRIVATE_LICENSE_KEY = LICENSE_FIXTURE.privateKey;
        }
        const result = spawnSync(
          process.execPath,
          [
            "-e",
            `
          const path = require("node:path");
          const {CliInternals} = require("@remotion/cli");
          const {BrowserSafeApis} = require("@remotion/renderer/client");
          const {getEnvironmentVariables} = require(path.join(path.dirname(require.resolve("@remotion/cli")), "get-env.js"));
          CliInternals.loadConfig(process.cwd()).then(async () => {
            const publicKey = BrowserSafeApis.options.publicLicenseKeyOption.getValue({commandLine: {}}).value;
            if (publicKey !== ${JSON.stringify(LICENSE_FIXTURE.publicKey)}) process.exit(2);
            const browserEnv = getEnvironmentVariables(null, "error", false);
            if (Object.keys(browserEnv).some(name => name !== "REMOTION_PUBLIC_KEY")) process.exit(3);
            if (!process.env.AVANDAR_REMOTION_KEYS_FILE) process.exit(4);
            if (${JSON.stringify(source)} === "environment" && !process.env.AVANDAR_REMOTION_PRIVATE_KEY) process.exit(4);
            await CliInternals.loadConfig(process.cwd());
            const reloadedEnv = getEnvironmentVariables(null, "error", false);
            if (Object.keys(reloadedEnv).some(name => name !== "REMOTION_PUBLIC_KEY")) process.exit(3);
            console.log("configured");
          });
        `,
          ],
          {
            cwd: APP_ROOT,
            env: environment,
            encoding: "utf8",
            timeout: 10_000,
          },
        );
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.stdout, "configured\n");
        assert.equal(result.stderr, "");
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
        "--input-type=module",
        "-e",
        `
      const {renderFilm} = await import("./scripts/showcase/render.ts");
      await renderFilm({}, ${JSON.stringify(id)}, () => {});
    `,
      ],
      {
        cwd: APP_ROOT,
        env: licenseTestEnvironment(path.join(directory, ".env.local")),
        encoding: "utf8",
        timeout: 10_000,
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
    await writeFile(filename, buildLicenseFixture());
    assert.deepEqual(
      readLicense(directory, {
        REMOTION_PUBLIC_KEY: "rm_pub_ciFixture",
        REMOTION_PRIVATE_KEY: "rm_priv_ciFixture",
      }),
      { publicKey: "rm_pub_ciFixture", privateKey: "rm_priv_ciFixture" },
    );
    assert.equal(await readFile(filename, "utf8"), buildLicenseFixture());
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
        () => readLicense(directory, environment),
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
    await writeFile(filename, buildLicenseFixture());
    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `await import(${JSON.stringify(new URL("../scripts/require-license.mjs", import.meta.url).href)}).then(({ requireLicense }) => {
        requireLicense();
        if (process.env.REMOTION_PRIVATE_KEY || process.env.PRODUCER_UNRELATED_SECRET) process.exit(2);
        console.log("licensed");
      });`,
      ],
      {
        cwd: directory,
        env: licenseTestEnvironment(filename),
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

test("every package command fails before starting without license keys", async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), "producer-license-"));
  const manifest = JSON.parse(
    await readFile(path.join(APP_ROOT, "package.json"), "utf8"),
  );
  try {
    for (const command of Object.values(manifest.scripts) as string[]) {
      await context.test(command, () => {
        const result = spawnSync("sh", ["-c", command], {
          cwd: APP_ROOT,
          env: licenseTestEnvironment(path.join(directory, ".env.local")),
          encoding: "utf8",
          timeout: 10_000,
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

test("direct script entry points reject missing keys before doing work", async (context) => {
  const commands = [
    [process.execPath, ["--import", "tsx", "scripts/showcase/server.ts"]],
    [process.execPath, ["--import", "tsx", "scripts/motion.ts", "list"]],
    ...[
      "build-avandar",
      "build-motion-gallery",
      "review-avandar",
      "render-sequence",
      "measure-avandar",
      "deliver-avandar",
      "new-video",
      "adopt-theme",
      "check-frames",
      "curate-capture",
      "capture-avandar/capture-avandar",
    ].map((name) => [process.execPath, [`scripts/${name}.mjs`]]),
    [process.execPath, ["--import", "tsx", "scripts/read-theme.mjs"]],
    ...["studio", "preview", "render", "render-showcase", "add-sfx"].map(
      (name) => ["sh", [`scripts/${name}.sh`]],
    ),
    ...["generate", "validate"].map((name) => [
      "python3",
      [`demo-data/${name}.py`],
    ]),
  ] as Array<[string, string[]]>;
  const directory = await mkdtemp(path.join(tmpdir(), "producer-license-"));
  try {
    for (const [program, args] of commands) {
      await context.test(args.join(" "), () => {
        const result = spawnSync(program, args, {
          cwd: APP_ROOT,
          env: licenseTestEnvironment(path.join(directory, ".env.local")),
          encoding: "utf8",
          timeout: 10_000,
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
