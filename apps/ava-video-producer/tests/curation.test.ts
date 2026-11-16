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
import { curateCapture } from "../scripts/curateCapture/curateCapture";

const image = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=",
  "base64",
);
function _hash(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** One action a fixture manifest records. */
type ManifestAction = {
  id: string;
  flowId: string;
  status: string;
  sourceUrl: string;
  resultUrl: string;
  startedAtMs: number;
  endedAtMs: number;
};

/** One resource a fixture manifest records. */
type ManifestResource = {
  flowId: string;
  kind: string;
  id: string;
  name: string;
};

/** One checkpoint a fixture manifest records, with its screenshot hash. */
type ManifestCheckpoint = {
  id: string;
  flowId: string;
  status: string;
  sourceUrl: string;
  atMs: number;
  videoAtMs: number;
  screenshot: { path: string; sha256: string };
};

/** The mutable manifest shape each test edits before curating it. */
type PassedManifest = {
  schemaVersion: number;
  runId: string;
  status: string;
  startedAt: string;
  finishedAt: string;
  features: Array<{ id: string; status: string }>;
  fixtures: Array<{ path: string; sha256: string; bytes: number }>;
  actions: ManifestAction[];
  resources: ManifestResource[];
  checkpoints: ManifestCheckpoint[];
};

/** A temporary project holding one run directory and its manifest. */
type CurationFixture = {
  root: string;
  runDir: string;
  run: string;
  manifest: PassedManifest;
  save: () => Promise<void>;
};

/** A passed one-flow capture manifest whose screenshot matches `image`. */
function _createPassedManifest(): PassedManifest {
  return {
    schemaVersion: 1,
    runId: "fixture-run",
    status: "passed",
    startedAt: "2026-10-14T00:00:00Z",
    finishedAt: "2026-10-14T00:01:00Z",
    features: [{ id: "import", status: "passed" }],
    fixtures: [{ path: "cases.csv", sha256: _hash("id\n1\n"), bytes: 5 }],
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
        screenshot: { path: "screens/import-ready.png", sha256: _hash(image) },
      },
    ],
  };
}

async function _createCurationFixture(
  t: TestContext,
): Promise<CurationFixture> {
  const root = await mkdtemp(join(tmpdir(), "capture-curation-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runDir = "out/captures/fixture-run";
  const run = join(root, runDir);
  await mkdir(join(run, "screens"), { recursive: true });
  await writeFile(join(run, "screens/import-ready.png"), image);
  const manifest = _createPassedManifest();
  const save = () =>
    writeFile(join(run, "manifest.json"), JSON.stringify(manifest));
  await save();
  return { root, runDir, run, manifest, save };
}

test("curation copies verified screenshots and links source evidence without URL queries", async (t) => {
  const fixture = await _createCurationFixture(t);
  const original = await readFile(join(fixture.run, "manifest.json"));
  const result = await curateCapture({
    root: fixture.root,
    runDir: fixture.runDir,
  });
  assert.equal(result.screenshots, 1);
  assert.equal(result.backup, null);
  assert.deepEqual(
    await readFile(join(result.screensDirectory, "import-ready.png")),
    image,
  );
  const evidence = JSON.parse(await readFile(result.evidencePath, "utf8"));
  assert.equal(evidence.source.manifestSha256, _hash(original));
  assert.equal(evidence.source.runDirectory, fixture.runDir);
  assert.deepEqual(evidence.fixtures, fixture.manifest.fixtures);
  assert.deepEqual(evidence.resources, fixture.manifest.resources);
  assert.equal(
    evidence.actions[0].sourceUrl,
    "http://localhost:5173/avandar-labs/import",
  );
  assert.equal(
    evidence.screenshots[0].asset,
    "avandar/screens/import-ready.png",
  );
  assert.equal(evidence.screenshots[0].sha256, _hash(image));
  assert.deepEqual(
    await readFile(join(fixture.run, "manifest.json")),
    original,
  );
});

test("failed status, flow, action, checkpoint and changed screenshot each reject before curation", async (t) => {
  const changes: Array<(fixture: CurationFixture) => void> = [
    (fixture) => {
      fixture.manifest.status = "failed";
    },
    (fixture) => {
      fixture.manifest.features[0].status = "failed";
    },
    (fixture) => {
      fixture.manifest.actions[0].status = "failed";
    },
    (fixture) => {
      fixture.manifest.checkpoints[0].status = "failed";
    },
    (fixture) => {
      fixture.manifest.checkpoints[0].flowId = "unknown";
    },
    (fixture) => {
      fixture.manifest.checkpoints[0].screenshot.sha256 =
        _hash("different bytes");
    },
  ];
  for (const change of changes) {
    const fixture = await _createCurationFixture(t);
    change(fixture);
    await fixture.save();
    await assert.rejects(
      curateCapture({ root: fixture.root, runDir: fixture.runDir }),
      /passed|hash mismatch/,
    );
    await assert.rejects(readdir(join(fixture.root, "public")), /ENOENT/);
  }
});

test("run and screenshot paths reject traversal, hidden paths, outside roots and symlinks", async (t) => {
  const fixture = await _createCurationFixture(t);
  for (const runDir of [
    "../out/captures/fixture-run",
    "out/captures/../captures/fixture-run",
    "/tmp/not-this-project",
    "out/captures/.hidden",
  ]) {
    await assert.rejects(
      curateCapture({ root: fixture.root, runDir }),
      /plain|relative|traversal/,
    );
  }
  for (const capturePath of [
    "../outside.png",
    "/tmp/outside.png",
    "screens/.hidden.png",
  ]) {
    fixture.manifest.checkpoints[0].screenshot.path = capturePath;
    await fixture.save();
    await assert.rejects(
      curateCapture({ root: fixture.root, runDir: fixture.runDir }),
      /relative path/,
    );
  }
  await writeFile(join(fixture.root, "outside.png"), image);
  await symlink(
    join(fixture.root, "outside.png"),
    join(fixture.run, "screens/linked.png"),
  );
  fixture.manifest.checkpoints[0].screenshot.path = "screens/linked.png";
  await fixture.save();
  await assert.rejects(
    curateCapture({ root: fixture.root, runDir: fixture.runDir }),
    /symbolic links/,
  );
  await symlink(fixture.run, join(fixture.root, "out/captures/linked-run"));
  await assert.rejects(
    curateCapture({ root: fixture.root, runDir: "out/captures/linked-run" }),
    /symbolic links/,
  );
  await assert.rejects(readdir(join(fixture.root, "public")), /ENOENT/);
});

test("colliding filenames and credential-shaped evidence are rejected", async (t) => {
  const fixture = await _createCurationFixture(t);
  fixture.manifest.checkpoints.push({
    ...fixture.manifest.checkpoints[0],
    id: "duplicate",
  });
  await fixture.save();
  await assert.rejects(
    curateCapture({ root: fixture.root, runDir: fixture.runDir }),
    /unique plain image names/,
  );
  fixture.manifest.checkpoints.pop();
  fixture.manifest.resources[0].name = "Bearer hidden-value";
  await fixture.save();
  await assert.rejects(
    curateCapture({ root: fixture.root, runDir: fixture.runDir }),
    /Credential-shaped/,
  );
});

test("replacement is explicit and preserves the complete previous curated set", async (t) => {
  const fixture = await _createCurationFixture(t);
  const first = await curateCapture({
    root: fixture.root,
    runDir: fixture.runDir,
  });
  const oldEvidence = await readFile(first.evidencePath);
  await writeFile(
    join(fixture.root, "public/avandar/clip.mp4"),
    "unrelated asset",
  );
  await assert.rejects(
    curateCapture({ root: fixture.root, runDir: fixture.runDir }),
    /--replace/,
  );
  assert.deepEqual(await readFile(first.evidencePath), oldEvidence);
  const nextImage = Buffer.concat([image, Buffer.from("new capture bytes")]);
  await writeFile(join(fixture.run, "screens/import-ready.png"), nextImage);
  fixture.manifest.checkpoints[0].screenshot.sha256 = _hash(nextImage);
  await fixture.save();
  const second = await curateCapture({
    root: fixture.root,
    runDir: fixture.runDir,
    replace: true,
  });
  assert.ok(second.backup);
  assert.deepEqual(
    await readFile(
      join(fixture.root, second.backup, "screens/import-ready.png"),
    ),
    image,
  );
  assert.deepEqual(
    await readFile(join(fixture.root, second.backup, "capture-evidence.json")),
    oldEvidence,
  );
  assert.deepEqual(
    await readFile(join(second.screensDirectory, "import-ready.png")),
    nextImage,
  );
  assert.equal(
    await readFile(join(fixture.root, "public/avandar/clip.mp4"), "utf8"),
    "unrelated asset",
  );
});

test("curation refuses output symlinks without creating files outside the project", async (t) => {
  const fixture = await _createCurationFixture(t);
  const outside = await mkdtemp(join(tmpdir(), "curation-outside-"));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await symlink(outside, join(fixture.root, "public"));
  await assert.rejects(
    curateCapture({ root: fixture.root, runDir: fixture.runDir }),
    /symbolic links/,
  );
  assert.deepEqual(await readdir(outside), []);
});
