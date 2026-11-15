import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import { curateCapture } from "../scripts/curate-capture.mjs";

const image = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=",
  "base64",
);
const hash = (value: Buffer | string) =>
  createHash("sha256").update(value).digest("hex");

async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), "capture-curation-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runDir = "out/captures/fixture-run";
  const run = join(root, runDir);
  await mkdir(join(run, "screens"), { recursive: true });
  await writeFile(join(run, "screens/import-ready.png"), image);
  const manifest = {
    schemaVersion: 1,
    runId: "fixture-run",
    status: "passed",
    startedAt: "2026-10-14T00:00:00Z",
    finishedAt: "2026-10-14T00:01:00Z",
    features: [{ id: "import", status: "passed" }],
    fixtures: [{ path: "cases.csv", sha256: hash("id\n1\n"), bytes: 5 }],
    actions: [
      {
        id: "save",
        flowId: "import",
        status: "passed",
        sourceUrl:
          "http://localhost:5173/avandar-labs/import?temporary=private",
        resultUrl: "http://localhost:5173/avandar-labs/datasets/fixture",
        startedAtMs: 10,
        endedAtMs: 20,
      },
    ],
    resources: [
      {
        flowId: "import",
        kind: "dataset",
        id: "fixture",
        name: "Fictional cases",
      },
    ],
    checkpoints: [
      {
        id: "ready",
        flowId: "import",
        status: "passed",
        sourceUrl: "http://localhost:5173/avandar-labs/datasets/fixture",
        atMs: 30,
        videoAtMs: 20,
        screenshot: { path: "screens/import-ready.png", sha256: hash(image) },
      },
    ],
  };
  const save = () =>
    writeFile(join(run, "manifest.json"), JSON.stringify(manifest));
  await save();
  return { root, runDir, run, manifest, save };
}

test("curation copies verified screenshots and links source evidence without URL queries", async (t) => {
  const f = await fixture(t);
  const original = await readFile(join(f.run, "manifest.json"));
  const result = await curateCapture({ root: f.root, runDir: f.runDir });
  assert.equal(result.screenshots, 1);
  assert.equal(result.backup, null);
  assert.deepEqual(
    await readFile(join(result.screensDirectory, "import-ready.png")),
    image,
  );
  const evidence = JSON.parse(await readFile(result.evidencePath, "utf8"));
  assert.equal(evidence.source.manifestSha256, hash(original));
  assert.equal(evidence.source.runDirectory, f.runDir);
  assert.deepEqual(evidence.fixtures, f.manifest.fixtures);
  assert.deepEqual(evidence.resources, f.manifest.resources);
  assert.equal(
    evidence.actions[0].sourceUrl,
    "http://localhost:5173/avandar-labs/import",
  );
  assert.equal(
    evidence.screenshots[0].asset,
    "avandar/screens/import-ready.png",
  );
  assert.equal(evidence.screenshots[0].sha256, hash(image));
  assert.deepEqual(await readFile(join(f.run, "manifest.json")), original);
});

test("failed status, flow, action, checkpoint and changed screenshot each reject before curation", async (t) => {
  const changes = [
    (f: Awaited<ReturnType<typeof fixture>>) => {
      f.manifest.status = "failed";
    },
    (f: Awaited<ReturnType<typeof fixture>>) => {
      f.manifest.features[0].status = "failed";
    },
    (f: Awaited<ReturnType<typeof fixture>>) => {
      f.manifest.actions[0].status = "failed";
    },
    (f: Awaited<ReturnType<typeof fixture>>) => {
      f.manifest.checkpoints[0].status = "failed";
    },
    (f: Awaited<ReturnType<typeof fixture>>) => {
      f.manifest.checkpoints[0].flowId = "unknown";
    },
    (f: Awaited<ReturnType<typeof fixture>>) => {
      f.manifest.checkpoints[0].screenshot.sha256 = hash("different bytes");
    },
  ];
  for (const change of changes) {
    const f = await fixture(t);
    change(f);
    await f.save();
    await assert.rejects(
      curateCapture({ root: f.root, runDir: f.runDir }),
      /passed|hash mismatch/,
    );
    await assert.rejects(readdir(join(f.root, "public")), /ENOENT/);
  }
});

test("run and screenshot paths reject traversal, hidden paths, outside roots and symlinks", async (t) => {
  const f = await fixture(t);
  for (const runDir of [
    "../out/captures/fixture-run",
    "out/captures/../captures/fixture-run",
    "/tmp/not-this-project",
    "out/captures/.hidden",
  ]) {
    await assert.rejects(
      curateCapture({ root: f.root, runDir }),
      /plain|relative|traversal/,
    );
  }
  for (const capturePath of [
    "../outside.png",
    "/tmp/outside.png",
    "screens/.hidden.png",
  ]) {
    f.manifest.checkpoints[0].screenshot.path = capturePath;
    await f.save();
    await assert.rejects(
      curateCapture({ root: f.root, runDir: f.runDir }),
      /relative path/,
    );
  }
  await writeFile(join(f.root, "outside.png"), image);
  await symlink(join(f.root, "outside.png"), join(f.run, "screens/linked.png"));
  f.manifest.checkpoints[0].screenshot.path = "screens/linked.png";
  await f.save();
  await assert.rejects(
    curateCapture({ root: f.root, runDir: f.runDir }),
    /symbolic links/,
  );
  await symlink(f.run, join(f.root, "out/captures/linked-run"));
  await assert.rejects(
    curateCapture({ root: f.root, runDir: "out/captures/linked-run" }),
    /symbolic links/,
  );
  await assert.rejects(readdir(join(f.root, "public")), /ENOENT/);
});

test("colliding filenames and credential-shaped evidence are rejected", async (t) => {
  const f = await fixture(t);
  f.manifest.checkpoints.push({
    ...f.manifest.checkpoints[0],
    id: "duplicate",
  });
  await f.save();
  await assert.rejects(
    curateCapture({ root: f.root, runDir: f.runDir }),
    /unique plain image names/,
  );
  f.manifest.checkpoints.pop();
  f.manifest.resources[0].name = "Bearer hidden-value";
  await f.save();
  await assert.rejects(
    curateCapture({ root: f.root, runDir: f.runDir }),
    /Credential-shaped/,
  );
});

test("replacement is explicit and preserves the complete previous curated set", async (t) => {
  const f = await fixture(t);
  const first = await curateCapture({ root: f.root, runDir: f.runDir });
  const oldEvidence = await readFile(first.evidencePath);
  await writeFile(join(f.root, "public/avandar/clip.mp4"), "unrelated asset");
  await assert.rejects(
    curateCapture({ root: f.root, runDir: f.runDir }),
    /--replace/,
  );
  assert.deepEqual(await readFile(first.evidencePath), oldEvidence);
  const nextImage = Buffer.concat([image, Buffer.from("new capture bytes")]);
  await writeFile(join(f.run, "screens/import-ready.png"), nextImage);
  f.manifest.checkpoints[0].screenshot.sha256 = hash(nextImage);
  await f.save();
  const second = await curateCapture({
    root: f.root,
    runDir: f.runDir,
    replace: true,
  });
  assert.ok(second.backup);
  assert.deepEqual(
    await readFile(join(f.root, second.backup, "screens/import-ready.png")),
    image,
  );
  assert.deepEqual(
    await readFile(join(f.root, second.backup, "capture-evidence.json")),
    oldEvidence,
  );
  assert.deepEqual(
    await readFile(join(second.screensDirectory, "import-ready.png")),
    nextImage,
  );
  assert.equal(
    await readFile(join(f.root, "public/avandar/clip.mp4"), "utf8"),
    "unrelated asset",
  );
});

test("curation refuses output symlinks without creating files outside the project", async (t) => {
  const f = await fixture(t);
  const outside = await mkdtemp(join(tmpdir(), "curation-outside-"));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await symlink(outside, join(f.root, "public"));
  await assert.rejects(
    curateCapture({ root: f.root, runDir: f.runDir }),
    /symbolic links/,
  );
  assert.deepEqual(await readdir(outside), []);
});
