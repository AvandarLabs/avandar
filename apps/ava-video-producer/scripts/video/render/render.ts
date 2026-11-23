import fs from "node:fs/promises";
import path from "node:path";
import { MediaHelpers } from "../../lib/MediaHelpers/MediaHelpers";
import { requireMatchingPreview } from "../../lib/planHelpers/requireMatchingPreview";
import { assertFingerprintUnchanged } from "../assertFingerprintUnchanged";
import { exportPlan } from "../exportPlan";
import { fingerprintThemedPlan } from "../fingerprintThemedPlan";
import { freshStage } from "../freshStage";
import { stageAssets } from "../stageAssets";
import { writeJson } from "../writeJson";
import { runPictureRender } from "./runPictureRender";
import { writeRenderManifest } from "./writeRenderManifest";
import type { Storyboard } from "../../../src/storyboard/schema/schema";
import type { VideoThemeSnapshot } from "../../../src/videoTheme/VideoThemeSnapshots/VideoThemeSnapshots";

type RenderParameters = {
  plan: Storyboard;
  filename: string;
  workspace: string;
  theme: VideoThemeSnapshot;
};
async function _requirePreview({
  plan,
  workspace,
  fingerprint,
}: Readonly<{
  plan: Storyboard;
  workspace: string;
  fingerprint: Awaited<ReturnType<typeof fingerprintThemedPlan>>;
}>): Promise<void> {
  const previewDirectory = path.join(workspace, "out", plan.id, "preview");
  await requireMatchingPreview({
    filename: path.join(previewDirectory, "manifest.json"),
    fingerprint,
  });
  await fs.access(path.join(previewDirectory, "contact-sheet.jpg"));
}
async function _renderPicture({
  plan,
  theme,
  directory,
  workspace,
}: Readonly<
  Pick<RenderParameters, "plan" | "theme" | "workspace"> & { directory: string }
>): Promise<void> {
  const props = path.join(directory, "props.json");
  await writeJson({
    filename: props,
    value: { plan, theme },
  });
  const publicDir = await stageAssets({
    plan,
    directory,
    workspace,
  });
  await runPictureRender({ plan, directory, props, publicDir });
}
/**
 * Delegate picture creation to the original JPEG, encode and mandatory gate
 * path.
 */
export async function render({
  plan,
  filename,
  workspace,
  theme,
}: Readonly<RenderParameters>): Promise<string> {
  const fingerprint = await fingerprintThemedPlan({
    plan,
    filename,
    workspace,
    theme,
  });
  await _requirePreview({ plan, workspace, fingerprint });
  const directory = await freshStage({
    plan,
    name: "render",
    workspace,
  });
  await _renderPicture({ plan, theme, directory, workspace });
  const picture = path.join(directory, `${plan.id}.mp4`);
  const final = path.join(directory, "final.mp4");
  const hasAudio = await MediaHelpers.mixAudio({
    plan,
    root: workspace,
    picture,
    destination: final,
  });
  assertFingerprintUnchanged({
    before: fingerprint,
    after: await fingerprintThemedPlan({ plan, filename, workspace, theme }),
    message:
      "Plan, media or renderer changed during render; outputs remain for inspection",
  });
  await writeRenderManifest({ plan, directory, fingerprint, hasAudio });
  await exportPlan({
    plan,
    workspace,
  });
  await fs.rm(path.join(directory, `${plan.id}-frames`), {
    recursive: true,
    force: true,
  });
  return final;
}
