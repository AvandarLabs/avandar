import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { prop } from "@avandar/utils";
import { CaptureFileSafety } from "../CaptureFileSafety";
import { CaptureUrlSafety } from "../CaptureUrlSafety/CaptureUrlSafety";

test("capture ids and fixture paths reject traversal and hidden files", () => {
  assert.equal(
    CaptureUrlSafety.validateId({ value: "import-cases" }),
    "import-cases",
  );
  assert.equal(
    CaptureFileSafety.validateRelativePath({ value: "fixtures/cases.csv" }),
    "fixtures/cases.csv",
  );
  Array.from([
    "../unsafe",
    "two words",
    "Uppercase",
    "id/other",
    "",
    "x".repeat(81),
  ]).forEach((id) => {
    assert.throws(() => {
      return CaptureUrlSafety.validateId({ value: id });
    });
  });
  Array.from([
    "../cases.csv",
    "/tmp/cases.csv",
    "fixtures/../cases.csv",
    ".private.csv",
    "fixtures\\cases.csv",
    "fixtures/%2e%2e/key.csv",
  ]).forEach((path) => {
    assert.throws(() => {
      return CaptureFileSafety.validateRelativePath({ value: path });
    });
  });
});

test("unique output directories preserve prior runs and fixture inventory hashes actual bytes", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "capture-files-"));
  t.after(() => {
    return rm(root, { recursive: true, force: true });
  });
  await mkdir(join(root, "demo-data"));
  await writeFile(join(root, "demo-data", "cases.csv"), "id,value\n1,3\n");
  await writeFile(join(root, "demo-data", "ignored.md"), "not a fixture");
  const first = await CaptureFileSafety.createRunDirectory({
    rootPath: root,
    runLabel: "fixture-run",
    now: new Date("2026-10-14T00:00:00Z"),
  });
  const second = await CaptureFileSafety.createRunDirectory({
    rootPath: root,
    runLabel: "fixture-run",
    now: new Date("2026-10-14T00:00:00Z"),
  });
  assert.notEqual(first, second);
  const inventory = await CaptureFileSafety.makeFixtureInventoryFromDirectory({
    rootPath: root,
    fixtureDir: "demo-data",
  });
  assert.deepEqual(inventory.files.map(prop("path")), ["cases.csv"]);
  assert.match(inventory.files[0].sha256, /^[a-f0-9]{64}$/);
  await assert.rejects(
    CaptureFileSafety.makeFixtureInventoryFromDirectory({
      rootPath: root,
      fixtureDir: "../",
      fixtureFiles: ["cases.csv"],
    }),
    /escapes/,
  );
  await symlink(
    join(root, "demo-data", "cases.csv"),
    join(root, "demo-data", "linked.csv"),
  );
  await assert.rejects(
    CaptureFileSafety.makeFixtureInventoryFromDirectory({
      rootPath: root,
      fixtureDir: "demo-data",
    }),
    /symbolic link/,
  );
});

test("output path refuses a symlink before creating directories outside its root", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "capture-link-"));
  const outside = await mkdtemp(join(tmpdir(), "capture-outside-"));
  t.after(() => {
    return Promise.all([
      rm(root, { recursive: true, force: true }),
      rm(outside, { recursive: true, force: true }),
    ]);
  });
  await symlink(outside, join(root, "out"));
  await assert.rejects(
    CaptureFileSafety.createRunDirectory({
      rootPath: root,
      runLabel: "test-run",
    }),
    /plain directories/,
  );
  assert.deepEqual(await readdir(outside), []);
});
