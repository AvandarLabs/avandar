import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  LICENSE_FIXTURE,
  LicenseFixtures,
} from "../../../tests/LicenseFixtures";

const APP_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const PRIVATE_ROOT = path.resolve(APP_ROOT, "../../.videos");
const FAULT_PRELOAD = `
import fs from "node:fs/promises";
const originalRead = fs.readFile.bind(fs);
const originalWrite = fs.writeFile.bind(fs);
const originalOpen = fs.open.bind(fs);
const project = process.env.PRODUCER_TEST_PROJECT;
const mode = process.env.PRODUCER_TEST_FAULT;
fs.readFile = async function(filename, ...args) {
  if (String(filename).endsWith("storyboards/motion-reference.json")) {
    if (mode === "read") throw new Error("Injected starter read failure");
    if (mode === "parse") return "{broken starter";
  }
  return originalRead(filename, ...args);
};
async function failWrite(filename) {
  await originalWrite(filename, "partial storyboard");
  if (mode === "foreign") await originalWrite(project + "/foreign.txt", "concurrent owner");
  throw new Error("Injected partial storyboard write failure");
}
fs.writeFile = async function(filename, ...args) {
  if (String(filename) === project + "/storyboard.json" && ["write", "foreign"].includes(mode)) {
    return failWrite(filename);
  }
  return originalWrite(filename, ...args);
};
fs.open = async function(filename, ...args) {
  const handle = await originalOpen(filename, ...args);
  if (String(filename) === project + "/storyboard.json" && ["write", "foreign"].includes(mode)) {
    handle.writeFile = async function() { return failWrite(filename); };
  }
  return handle;
};
`;

async function _createFixture() {
  const directory = await fs.mkdtemp(path.join(tmpdir(), "producer-project-"));
  const name = `cli-regression-${randomUUID()}`;
  const project = path.join(PRIVATE_ROOT, name);
  const preload = path.join(directory, "fault.mjs");
  await fs.writeFile(preload, FAULT_PRELOAD);
  await fs.mkdir(PRIVATE_ROOT, { recursive: true });
  assert.equal((await fs.lstat(PRIVATE_ROOT)).isSymbolicLink(), false);
  return { directory, name, project, preload };
}

function _runProject(
  fixture: Awaited<ReturnType<typeof _createFixture>>,
  fault = "",
) {
  return spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      pathToFileURL(fixture.preload).href,
      "scripts/newVideo.ts",
      fixture.name,
    ],
    {
      cwd: APP_ROOT,
      env: {
        ...LicenseFixtures.licenseTestEnvironment("/dev/null"),
        REMOTION_PUBLIC_KEY: LICENSE_FIXTURE.publicKey,
        REMOTION_PRIVATE_KEY: LICENSE_FIXTURE.privateKey,
        PRODUCER_TEST_PROJECT: fixture.project,
        PRODUCER_TEST_FAULT: fault,
      },
      encoding: "utf8",
      timeout: 10000,
    },
  );
}

async function _removeFixture(
  fixture: Awaited<ReturnType<typeof _createFixture>>,
) {
  await fs.rm(fixture.project, { force: true, recursive: true });
  await fs.rm(fixture.directory, { force: true, recursive: true });
}

function _assertFailed(result: ReturnType<typeof _runProject>) {
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
}

test("starter read and parse failures create no project and permit a clean retry", async (context) => {
  for (const fault of ["read", "parse"]) {
    await context.test(fault, async () => {
      const fixture = await _createFixture();
      try {
        _assertFailed(_runProject(fixture, fault));
        assert.equal(existsSync(fixture.project), false);
        const retry = _runProject(fixture);
        assert.equal(retry.status, 0, retry.stderr);
        const plan = JSON.parse(
          await fs.readFile(
            path.join(fixture.project, "storyboard.json"),
            "utf8",
          ),
        );
        assert.equal(plan.id, fixture.name);
      } finally {
        await _removeFixture(fixture);
      }
    });
  }
});

test("partial storyboard write removes only the operation's own files", async () => {
  const fixture = await _createFixture();
  try {
    _assertFailed(_runProject(fixture, "write"));
    assert.equal(existsSync(fixture.project), false);
    assert.equal(_runProject(fixture).status, 0);
  } finally {
    await _removeFixture(fixture);
  }
});

test("failed creation preserves a concurrently added foreign file and reports its remaining path", async () => {
  const fixture = await _createFixture();
  try {
    const result = _runProject(fixture, "foreign");
    _assertFailed(result);
    assert.equal(
      await fs.readFile(path.join(fixture.project, "foreign.txt"), "utf8"),
      "concurrent owner",
    );
    assert.equal(
      existsSync(path.join(fixture.project, "storyboard.json")),
      false,
    );
    assert.equal(existsSync(path.join(fixture.project, "public")), false);
    assert.ok(result.stderr.includes(fixture.project));
  } finally {
    await _removeFixture(fixture);
  }
});

test("existing project and symlink claims never overwrite or remove existing contents", async (context) => {
  for (const isSymlink of [false, true]) {
    await context.test(String(isSymlink), async () => {
      const fixture = await _createFixture();
      const target = path.join(fixture.directory, "existing");
      try {
        await fs.mkdir(target);
        await fs.writeFile(
          path.join(target, "storyboard.json"),
          "existing owner",
        );
        if (isSymlink) await fs.symlink(target, fixture.project);
        else await fs.cp(target, fixture.project, { recursive: true });
        _assertFailed(_runProject(fixture));
        assert.equal(
          await fs.readFile(
            path.join(fixture.project, "storyboard.json"),
            "utf8",
          ),
          "existing owner",
        );
        assert.equal(
          (await fs.lstat(fixture.project)).isSymbolicLink(),
          isSymlink,
        );
      } finally {
        await _removeFixture(fixture);
      }
    });
  }
});

test("successful creation writes a valid starter, announces progress and keeps stdout data-only", async () => {
  const fixture = await _createFixture();
  try {
    const result = _runProject(fixture);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Creating|Preparing/);
    assert.match(result.stderr, /✅/);
    const plan = JSON.parse(
      await fs.readFile(path.join(fixture.project, "storyboard.json"), "utf8"),
    );
    assert.equal(plan.id, fixture.name);
    assert.equal(
      (await fs.stat(path.join(fixture.project, "public"))).isDirectory(),
      true,
    );
  } finally {
    await _removeFixture(fixture);
  }
});
