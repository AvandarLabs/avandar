import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  previewFrames,
  fingerprintPlan,
  requireMatchingPreview,
  safeInputFile,
  ensureDirectory,
} from "../scripts/lib/planHelpers";
import { fixture, temporary } from "./pipeline-test-helpers";

test("preview samples the composed film on both sides of its transition", () => {
  const frames = previewFrames(fixture());
  for (const frame of [29, 30, 31, 36, 42, 59])
    assert.ok(frames.includes(frame), String(frame));
  assert.equal(new Set(frames).size, frames.length);
  assert.ok(frames.every((frame) => frame >= 0 && frame < 60));
});

test("render requires preview proof matching plan, renderer and asset bytes", async () =>
  temporary(async (root) => {
    const plan = fixture();
    const planPath = path.join(root, "plan.json");
    await fs.writeFile(planPath, JSON.stringify(plan));
    await fs.writeFile(path.join(root, "public/voice.wav"), "voice");
    await fs.writeFile(path.join(root, "public/effect.wav"), "effect");
    await fs.writeFile(
      path.join(root, "src/renderer.tsx"),
      "original renderer",
    );
    const fingerprint = await fingerprintPlan(root, planPath, plan);
    const manifest = path.join(root, "preview.json");
    await assert.rejects(
      requireMatchingPreview(manifest, fingerprint),
      /preview/i,
    );
    await fs.writeFile(
      manifest,
      JSON.stringify({ fingerprint, complete: true }),
    );
    await requireMatchingPreview(manifest, fingerprint);
    await fs.writeFile(path.join(root, "public/voice.wav"), "changed voice");
    await assert.rejects(
      requireMatchingPreview(
        manifest,
        await fingerprintPlan(root, planPath, plan),
      ),
      /changed/i,
    );
    await fs.writeFile(path.join(root, "public/voice.wav"), "voice");
    await fs.writeFile(path.join(root, "src/renderer.tsx"), "changed renderer");
    await assert.rejects(
      requireMatchingPreview(
        manifest,
        await fingerprintPlan(root, planPath, plan),
      ),
      /changed/i,
    );
    await fs.writeFile(planPath, JSON.stringify({ ...plan, title: "Revised" }));
    await assert.rejects(
      requireMatchingPreview(
        manifest,
        await fingerprintPlan(root, planPath, plan),
      ),
      /changed/i,
    );
  }));

test("input and output guards reject hidden files and symlink escapes before writes", async () =>
  temporary(async (root) => {
    await fs.writeFile(path.join(root, ".private"), "not narration");
    await fs.symlink(path.join(root, ".private"), path.join(root, "fake.wav"));
    await assert.rejects(
      safeInputFile(path.join(root, "fake.wav"), [".wav"]),
      /file|extension/i,
    );
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), "video-outside-"));
    try {
      await fs.symlink(outside, path.join(root, "public/audio"));
      await assert.rejects(
        ensureDirectory(root, "public/audio/pipeline-test"),
        /symlink/i,
      );
      assert.deepEqual(await fs.readdir(outside), []);
    } finally {
      await fs.rm(outside, { recursive: true, force: true });
    }
  }));
