import fs from "node:fs/promises";
import path from "node:path";
import { assertFingerprintUnchanged } from "../assertFingerprintUnchanged";
import { fingerprintThemedPlan } from "../fingerprintThemedPlan";
import { freshStage } from "../freshStage";
import { stageAssets } from "../stageAssets";
import { writeJson } from "../writeJson";
import { buildContactSheet } from "./buildContactSheet";
import { bundlePreviewSite } from "./bundlePreviewSite";
import { contactHtml } from "./contactHtml";
import { renderPreviewStills } from "./renderPreviewStills";
import type { Storyboard } from "../../../src/storyboard/schema/schema";
import type { VideoThemeSnapshot } from "../../../src/videoTheme/VideoThemeSnapshots/VideoThemeSnapshots";

type PreviewParameters = {
  plan: Storyboard;
  filename: string;
  workspace: string;
  theme: VideoThemeSnapshot;
};
async function _writePreviewManifest({
  directory,
  fingerprint,
  samples,
}: Readonly<{
  directory: string;
  fingerprint: Awaited<ReturnType<typeof fingerprintThemedPlan>>;
  samples: Awaited<ReturnType<typeof renderPreviewStills>>;
}>): Promise<void> {
  await writeJson({
    filename: path.join(directory, "manifest.json"),
    value: {
      version: 1,
      complete: true,
      generatedAt: new Date().toISOString(),
      fingerprint,
      samples,
      humanReview:
        "Inspect this preview before rendering; generation does not record approval.",
    },
  });
}
async function _writePreviewPage({
  plan,
  directory,
  samples,
}: Readonly<{
  plan: Storyboard;
  directory: string;
  samples: Awaited<ReturnType<typeof renderPreviewStills>>;
}>): Promise<void> {
  await buildContactSheet({ plan, directory, sampleCount: samples.length });
  await fs.writeFile(
    path.join(directory, "index.html"),
    contactHtml({
      plan,
      samples,
    }),
    { flag: "wx" },
  );
}
/** Render actual composition frames with one reusable headless browser. */
export async function preview({
  plan,
  filename,
  workspace,
  theme,
}: Readonly<PreviewParameters>): Promise<string> {
  const fingerprint = await fingerprintThemedPlan({
    plan,
    filename,
    workspace,
    theme,
  });
  // Finish source and asset fingerprint validation before creating a preview
  // output directory.
  // react-doctor-disable-next-line server-sequential-independent-await
  const directory = await freshStage({
    plan,
    name: "preview",
    workspace,
  });
  const publicDir = await stageAssets({
    plan,
    directory,
    workspace,
  });
  const serveUrl = await bundlePreviewSite({ plan, directory, publicDir });
  const samples = await renderPreviewStills({
    plan,
    theme,
    serveUrl,
    directory,
  });
  await _writePreviewPage({ plan, directory, samples });
  assertFingerprintUnchanged({
    before: fingerprint,
    after: await fingerprintThemedPlan({ plan, filename, workspace, theme }),
    message: "Plan, media or renderer changed during preview; run it again",
  });
  await _writePreviewManifest({ directory, fingerprint, samples });
  await fs.rm(path.join(directory, "bundle"), { recursive: true });
  await fs.rm(publicDir, { recursive: true });
  return directory;
}
