import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { PipelineTestFixtures } from "../../../../tests/PipelineTestFixtures";
import { fingerprintPlan } from "../fingerprintPlan";
import { getPreviewFramesFromPlan } from "../getPreviewFramesFromPlan";
import { safeInputFile, ensureDirectory } from "../planHelpers";
import { requireMatchingPreview } from "../requireMatchingPreview";

test("preview samples the composed film on both sides of its transition", () => {
  const frames = getPreviewFramesFromPlan(PipelineTestFixtures.fixture());
  [29, 30, 31, 36, 42, 59].forEach((frame) => {
    assert.ok(frames.includes(frame), String(frame));
  });
  assert.equal(new Set(frames).size, frames.length);
  assert.ok(
    frames.every((frame) => {
      return frame >= 0 && frame < 60;
    }),
  );
});

test("render requires preview proof matching plan, renderer and asset bytes", async () => {
  return PipelineTestFixtures.temporary(async (root) => {
    const { plan, planPath, fingerprint, manifest } =
      await _createPreviewProofFiles(root);
    await _assertInitialPreviewProof({ manifest, fingerprint });
    await fs.writeFile(path.join(root, "public/voice.wav"), "changed voice");
    await assert.rejects(
      requireMatchingPreview({
        filename: manifest,
        fingerprint: await fingerprintPlan({ root, filename: planPath, plan }),
      }),
      /changed/i,
    );
    await fs.writeFile(path.join(root, "public/voice.wav"), "voice");
    await fs.writeFile(path.join(root, "src/renderer.tsx"), "changed renderer");
    await assert.rejects(
      requireMatchingPreview({
        filename: manifest,
        fingerprint: await fingerprintPlan({ root, filename: planPath, plan }),
      }),
      /changed/i,
    );
    await fs.writeFile(planPath, JSON.stringify({ ...plan, title: "Revised" }));
    await assert.rejects(
      requireMatchingPreview({
        filename: manifest,
        fingerprint: await fingerprintPlan({ root, filename: planPath, plan }),
      }),
      /changed/i,
    );
  });
});

test("input and output guards reject hidden files and symlink escapes before writes", async () => {
  return PipelineTestFixtures.temporary(async (root) => {
    await fs.writeFile(path.join(root, ".private"), "not narration");
    await fs.symlink(path.join(root, ".private"), path.join(root, "fake.wav"));
    await assert.rejects(
      safeInputFile({
        filename: path.join(root, "fake.wav"),
        extensions: [".wav"],
      }),
      /file|extension/i,
    );
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), "video-outside-"));
    try {
      await fs.symlink(outside, path.join(root, "public/audio"));
      await assert.rejects(
        ensureDirectory({
          root,
          relative: "public/audio/pipeline-test",
        }),
        /symlink/i,
      );
      assert.deepEqual(await fs.readdir(outside), []);
    } finally {
      await fs.rm(outside, { recursive: true, force: true });
    }
  });
});

[
  "scripts/lib/FrameGateMeasurements/FrameGateMeasurements.constants.ts",
  "scripts/lib/FrameGateMeasurements/getFrameMeasurementsFromVideo.ts",
  "scripts/checkFrames/runCheckFrames.ts",
  "scripts/lib/MediaHelpers/runProcess.ts",
  "scripts/lib/planHelpers/getPreviewFramesFromPlan.ts",
  "scripts/lib/productRequirements/productRequirements.ts",
  "scripts/lib/getVideoWorkspaceFromPlanPath.ts",
  "scripts/lib/getSha256FromFile.ts",
  "scripts/lib/copyRootEnvFile.ts",
  "scripts/lib/getRemotionLicenseFromAppRoot.ts",
  "scripts/runProducerCommand/ProducerCli/ProducerCli.mjs",
  "scripts/runProducerCommand/runShellCommand.mjs",
  "scripts/video/render/runPictureRender.ts",
  "scripts/video/preview/renderPreviewStill.ts",
  "scripts/videoTheme/loadVideoThemeSnapshot/loadVideoThemeSnapshot.ts",
  "scripts/showcase/createThemeStore/makeValueFromStoredThemeText.ts",
  "scripts/showcase/ThemeStoreError.ts",
  "scripts/requireLicense.ts",
  "../../packages/shared/utils/src/promises/promiseMapSequential/promiseMapSequential.ts",
  "../../packages/shared/utils/package.json",
  "themes/classic.theme.json",
  "themes/avandar.theme.json",
  "themes/starter.theme.json",
].forEach((file) => {
  test(`editing ${file} invalidates storyboard preview evidence`, async () => {
    await _withWorkspaceSources(async (root) => {
      const sourceFile = path.resolve(root, file);
      await fs.mkdir(path.dirname(sourceFile), { recursive: true });
      await fs.writeFile(sourceFile, "original source");
      const { plan, planPath, fingerprint, manifest } =
        await _createPreviewProofFiles(root);
      await _assertInitialPreviewProof({ manifest, fingerprint });
      await fs.writeFile(sourceFile, "changed source");
      const changed = await fingerprintPlan({ root, filename: planPath, plan });
      assert.notEqual(changed.rendererSha256, fingerprint.rendererSha256);
      await assert.rejects(
        requireMatchingPreview({ filename: manifest, fingerprint: changed }),
        /changed/i,
      );
    });
  });
});

[
  "scripts/lib/MediaHelpers/MediaHelpers.test.ts",
  "scripts/video/__tests__/support.ts",
  "scripts/video/out/delivery.json",
  "scripts/lib/.env/credentials.ts",
  "scripts/checkFrames/.cache/measurements.json",
  "scripts/runProducerCommand/node_modules/dependency/index.mjs",
  "scripts/showcase/createThemeStore/out/draft.json",
  "src/renderer.test.ts",
  "src/.private/credential.ts",
  "src/out/generated.ts",
  "src/coverage/summary.json",
  "public/unreferenced.svg",
  "out/preview/manifest.json",
  ".env.local",
  ".videos/private/src/renderer.ts",
  "../../.videos/private/src/renderer.ts",
  "scripts/unrelated.ts",
  "scripts/showcase/renderFilm.ts",
  "scripts/buildProduct/compileProductSource.ts",
  "../../packages/shared/utils/src/promises/promiseMapSequential/promiseMapSequential.test.ts",
].forEach((file) => {
  test(`unreferenced ${file} cannot invalidate storyboard preview evidence`, async () => {
    await _withWorkspaceSources(async (root) => {
      const { plan, planPath, fingerprint, manifest } =
        await _createPreviewProofFiles(root);
      await _assertInitialPreviewProof({ manifest, fingerprint });
      const ignoredFile = path.resolve(root, file);
      await fs.mkdir(path.dirname(ignoredFile), { recursive: true });
      await fs.writeFile(ignoredFile, "unrelated source");
      const unchanged = await fingerprintPlan({
        root,
        filename: planPath,
        plan,
      });
      assert.deepEqual(unchanged, fingerprint);
      await requireMatchingPreview({
        filename: manifest,
        fingerprint: unchanged,
      });
    });
  });
});

[
  "scripts/lib",
  "scripts/lib/FrameGateMeasurements",
  "scripts/video",
  "scripts/checkFrames",
  "scripts/runProducerCommand",
  "scripts/videoTheme/loadVideoThemeSnapshot",
  "scripts/showcase/createThemeStore",
  "../../packages/shared/utils/src",
  "scripts/requireLicense.ts",
  "remotion.config.ts",
].forEach((file) => {
  test(`storyboard source symlinks at ${file} are rejected`, async () => {
    await _withWorkspaceSources(async (root) => {
      const { plan, planPath } = await _createPreviewProofFiles(root);
      const escapedDirectory = path.join(root, "out/escaped-source");
      await fs.mkdir(escapedDirectory, { recursive: true });
      const escapedFile = path.join(escapedDirectory, "runtime.ts");
      await fs.writeFile(escapedFile, "outside source");
      const filename = path.resolve(root, file);
      await fs.mkdir(path.dirname(filename), { recursive: true });
      await fs.symlink(
        file.endsWith(".ts") ? escapedFile : escapedDirectory,
        filename,
      );
      await assert.rejects(
        fingerprintPlan({ root, filename: planPath, plan }),
        /symlink/i,
      );
    });
  });
});

[
  "scripts/requireLicense.ts",
  "remotion.config.ts",
  "../../packages/shared/utils/package.json",
].forEach((file) => {
  test(`dangling storyboard support-file symlinks at ${file} are rejected`, async () => {
    await _withWorkspaceSources(async (root) => {
      const { plan, planPath } = await _createPreviewProofFiles(root);
      const filename = path.resolve(root, file);
      await fs.mkdir(path.dirname(filename), { recursive: true });
      await fs.symlink(path.join(root, "out/missing-source.ts"), filename);
      await assert.rejects(
        fingerprintPlan({ root, filename: planPath, plan }),
        /symlink/i,
      );
    });
  });
});

/**
 * Keeps the producer and workspace utility fixtures inside one scratch root.
 */
async function _withWorkspaceSources(
  action: (root: string) => Promise<void>,
): Promise<void> {
  await PipelineTestFixtures.temporary(async (workspace) => {
    const root = path.join(workspace, "apps/producer");
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.mkdir(path.join(root, "public"));
    await action(root);
  });
}

async function _createPreviewProofFiles(root: string): Promise<
  Readonly<{
    plan: ReturnType<typeof PipelineTestFixtures.fixture>;
    planPath: string;
    fingerprint: Awaited<ReturnType<typeof fingerprintPlan>>;
    manifest: string;
  }>
> {
  const plan = PipelineTestFixtures.fixture();
  const planPath = path.join(root, "plan.json");
  await fs.writeFile(planPath, JSON.stringify(plan));
  await fs.writeFile(path.join(root, "public/voice.wav"), "voice");
  await fs.writeFile(path.join(root, "public/effect.wav"), "effect");
  await fs.writeFile(path.join(root, "src/renderer.tsx"), "original renderer");
  const fingerprint = await fingerprintPlan({
    root,
    filename: planPath,
    plan,
  });
  const manifest = path.join(root, "preview.json");
  return { plan, planPath, fingerprint, manifest };
}

async function _assertInitialPreviewProof({
  manifest,
  fingerprint,
}: Readonly<{
  manifest: string;
  fingerprint: Awaited<ReturnType<typeof fingerprintPlan>>;
}>): Promise<void> {
  await assert.rejects(
    requireMatchingPreview({
      filename: manifest,
      fingerprint,
    }),
    /preview/i,
  );
  await fs.writeFile(manifest, JSON.stringify({ fingerprint, complete: true }));
  await requireMatchingPreview({
    filename: manifest,
    fingerprint,
  });
}
