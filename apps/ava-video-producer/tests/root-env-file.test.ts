/**
 * The workspace root's producer env file reaches the app before each command.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { copyRootEnvFile } from "../scripts/lib/copyRootEnvFile";
import {
  buildLicenseFixture,
  LICENSE_FIXTURE,
  licenseTestEnvironment,
} from "./license-fixture";

const ROOT_ENV_FILENAME = ".env.video-producer.local";

/** Lay out a workspace root with the producer app two levels below it. */
async function _createWorkspaceFixture(): Promise<{
  workspaceRoot: string;
  appRoot: string;
}> {
  // The guard compares its own URL to argv, so resolve the /tmp symlink.
  const workspaceRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), "producer-env-")),
  );
  const appRoot = path.join(workspaceRoot, "apps/ava-video-producer");
  await mkdir(appRoot, { recursive: true });
  return { workspaceRoot, appRoot };
}

test("the root env file is copied to the app .env.local with owner-only permissions", async () => {
  const { workspaceRoot, appRoot } = await _createWorkspaceFixture();
  try {
    await writeFile(
      path.join(workspaceRoot, ROOT_ENV_FILENAME),
      buildLicenseFixture(),
    );
    copyRootEnvFile(appRoot, {});
    const target = path.join(appRoot, ".env.local");
    assert.equal(await readFile(target, "utf8"), buildLicenseFixture());
    assert.equal((await stat(target)).mode & 0o777, 0o600);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("a stale app .env.local is replaced by the root env file", async () => {
  const { workspaceRoot, appRoot } = await _createWorkspaceFixture();
  try {
    await writeFile(
      path.join(workspaceRoot, ROOT_ENV_FILENAME),
      buildLicenseFixture(),
    );
    await writeFile(path.join(appRoot, ".env.local"), "REMOTION_PUBLIC_KEY=\n");
    copyRootEnvFile(appRoot, {});
    assert.equal(
      await readFile(path.join(appRoot, ".env.local"), "utf8"),
      buildLicenseFixture(),
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("an app .env.local that already matches the root env file keeps its modification time", async () => {
  const { workspaceRoot, appRoot } = await _createWorkspaceFixture();
  try {
    const target = path.join(appRoot, ".env.local");
    await writeFile(
      path.join(workspaceRoot, ROOT_ENV_FILENAME),
      buildLicenseFixture(),
    );
    await writeFile(target, buildLicenseFixture());
    const pastTime = new Date("2026-01-01T00:00:00Z");
    await utimes(target, pastTime, pastTime);
    copyRootEnvFile(appRoot, {});
    assert.equal((await stat(target)).mtimeMs, pastTime.getTime());
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("without a root env file the existing app .env.local is left unchanged", async () => {
  const { workspaceRoot, appRoot } = await _createWorkspaceFixture();
  try {
    const target = path.join(appRoot, ".env.local");
    await writeFile(target, buildLicenseFixture());
    copyRootEnvFile(appRoot, {});
    assert.equal(await readFile(target, "utf8"), buildLicenseFixture());
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("an explicit REMOTION_KEYS_FILE leaves the app .env.local uncopied", async () => {
  const { workspaceRoot, appRoot } = await _createWorkspaceFixture();
  try {
    await writeFile(
      path.join(workspaceRoot, ROOT_ENV_FILENAME),
      buildLicenseFixture(),
    );
    copyRootEnvFile(appRoot, {
      REMOTION_KEYS_FILE: path.join(workspaceRoot, "keys.env"),
    });
    await assert.rejects(stat(path.join(appRoot, ".env.local")), {
      code: "ENOENT",
    });
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("the license guard licenses a command from the root env file alone", async () => {
  const { workspaceRoot, appRoot } = await _createWorkspaceFixture();
  try {
    await Promise.all(
      [
        "scripts/requireLicense.ts",
        "scripts/lib/getRemotionLicenseFromAppRoot.ts",
        "scripts/lib/copyRootEnvFile.ts",
        "scripts/lib/productSourceHelpers.ts",
      ].map(async (filename) => {
        const destination = path.join(appRoot, filename);
        await mkdir(path.dirname(destination), { recursive: true });
        await copyFile(filename, destination);
      }),
    );
    await writeFile(
      path.join(workspaceRoot, ROOT_ENV_FILENAME),
      buildLicenseFixture(),
    );
    const environment = licenseTestEnvironment("");
    delete environment.REMOTION_KEYS_FILE;
    const result = spawnSync(
      process.execPath,
      // The fixture has no node_modules, so load tsx by its resolved URL.
      [
        "--import",
        import.meta.resolve("tsx"),
        path.join(appRoot, "scripts/requireLicense.ts"),
      ],
      { cwd: appRoot, env: environment, encoding: "utf8", timeout: 10_000 },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.ok(!result.stdout.includes(LICENSE_FIXTURE.privateKey));
    assert.ok(!result.stderr.includes(LICENSE_FIXTURE.privateKey));
    assert.equal(
      await readFile(path.join(appRoot, ".env.local"), "utf8"),
      buildLicenseFixture(),
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
