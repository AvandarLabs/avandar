import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildProduct } from "../scripts/build-avandar.mjs";
import {
  productRoot,
  productSourcePath,
  verifyProductBuild,
} from "../scripts/lib/product-source.mjs";

test("component provenance rejects secrets, private projects and paths outside product source", () => {
  const root = "/repo";
  assert.equal(productRoot("/repo/apps/ava-video-producer"), root);
  assert.equal(
    productSourcePath(root, "/repo/src/components/Card.tsx"),
    "src/components/Card.tsx",
  );
  for (const filename of [
    "/repo/.env.local",
    "/repo/.videos/secret.tsx",
    "/repo/src/../.env.local",
    "/other/src/Card.tsx",
    "/repo/src/.hidden/key.json",
  ]) {
    assert.throws(() => {
      productSourcePath(root, filename);
    }, /non-product source/);
  }
});

test("a product edit invalidates a previously compiled component preview", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "video-workspace-"));
  const app = path.join(root, "apps/ava-video-producer");
  try {
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.mkdir(path.join(app, "src/avandar/generated"), {
      recursive: true,
    });
    await fs.writeFile(path.join(root, "src/Card.tsx"), "original");
    await fs.writeFile(
      path.join(app, "src/avandar/generated/build.json"),
      JSON.stringify({
        files: [
          {
            path: "src/Card.tsx",
            sha256: createHash("sha256").update("original").digest("hex"),
          },
        ],
      }),
    );
    await verifyProductBuild(app);
    await fs.writeFile(path.join(root, "src/Card.tsx"), "updated");
    await assert.rejects(verifyProductBuild(app), /Product source changed/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

// Private film assets and outputs must remain beside the private plan.
test("nested private plans resolve to their project, while sample plans use the app", async () => {
  const { videoWorkspace } = await import("../scripts/lib/video-workspace.mjs");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "private-video-"));
  const app = path.join(root, "apps/ava-video-producer");
  try {
    await fs.mkdir(path.join(app, "storyboards"), { recursive: true });
    await fs.writeFile(path.join(app, "storyboards/example.json"), "{}");
    const project = path.join(root, ".videos/launch");
    await fs.mkdir(path.join(project, "out/film/scratch"), { recursive: true });
    const plan = path.join(project, "out/film/scratch/storyboard.json");
    await fs.writeFile(plan, "{}");
    assert.equal(await videoWorkspace(app, plan), project);
    assert.equal(
      await videoWorkspace(app, path.join(app, "storyboards/example.json")),
      app,
    );
    await fs.symlink(
      path.join(app, "storyboards/example.json"),
      path.join(project, "linked.json"),
    );
    await assert.rejects(
      videoWorkspace(app, path.join(project, "linked.json")),
      /symlink/,
    );
    await fs.symlink(app, path.join(root, ".videos/escape"));
    await assert.rejects(
      videoWorkspace(
        app,
        path.join(root, ".videos/escape/storyboards/example.json"),
      ),
      /symlink/,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

// Rebuilding before rendering must preserve a valid preview fingerprint.
test("unchanged product source produces identical JavaScript and CSS on rebuild", async () => {
  const app = fileURLToPath(new URL("../", import.meta.url));
  const outputDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "video-build-"),
  );
  try {
    await buildProduct({ outputDirectory });
    for (const filename of ["product.js", "product.css"]) {
      const current = await fs.readFile(
        path.join(app, "src/avandar/generated", filename),
      );
      const rebuilt = await fs.readFile(path.join(outputDirectory, filename));
      assert.equal(
        createHash("sha256").update(rebuilt).digest("hex"),
        createHash("sha256").update(current).digest("hex"),
        filename,
      );
    }
  } finally {
    await fs.rm(outputDirectory, { recursive: true, force: true });
  }
});
