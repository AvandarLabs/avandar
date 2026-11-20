import fs from "node:fs/promises";
import path from "node:path";
import { mixAudio } from "../../lib/mediaHelpers";
import { requireMatchingPreview } from "../../lib/planHelpers/planHelpers";
import { assertFingerprintUnchanged } from "../assertFingerprintUnchanged";
import { exportPlan } from "../exportPlan";
import { fingerprintThemedPlan } from "../fingerprintThemedPlan";
import { freshStage } from "../freshStage";
import { stageAssets } from "../stageAssets";
import { writeJson } from "../writeJson";
import { runPictureRender } from "./runPictureRender";
import { writeRenderManifest } from "./writeRenderManifest";
import type { Storyboard } from "../../../src/storyboard/schema/schema";
import type { VideoThemeSnapshot } from "../../../src/videoTheme/videoThemeSnapshotHelpers/videoThemeSnapshotHelpers";
/**
 * Delegate picture creation to the original JPEG, encode and mandatory gate
 * path.
 */
export async function render(
  plan: Storyboard,
  filename: string,
  workspace: string,
  theme: VideoThemeSnapshot,
): Promise<string> {
  const fingerprint = await fingerprintThemedPlan({
    plan,
    filename,
    workspace,
    theme,
  });
  const previewDirectory = path.join(workspace, "out", plan.id, "preview");
  await requireMatchingPreview(
    path.join(previewDirectory, "manifest.json"),
    fingerprint,
  );
  await fs.access(path.join(previewDirectory, "contact-sheet.jpg"));
  const directory = await freshStage(plan, "render", workspace);
  const props = path.join(directory, "props.json");
  await writeJson(props, { plan, theme });
  const publicDir = await stageAssets(plan, directory, workspace);
  await runPictureRender({ plan, directory, props, publicDir });
  const picture = path.join(directory, `${plan.id}.mp4`);
  const final = path.join(directory, "final.mp4");
  const hasAudio = await mixAudio(plan, workspace, picture, final);
  assertFingerprintUnchanged({
    before: fingerprint,
    after: await fingerprintThemedPlan({ plan, filename, workspace, theme }),
    message:
      "Plan, media or renderer changed during render; outputs remain for inspection",
  });
  await writeRenderManifest({ plan, directory, fingerprint, hasAudio });
  await exportPlan(plan, workspace);
  await fs.rm(path.join(directory, `${plan.id}-frames`), {
    recursive: true,
    force: true,
  });
  return final;
}
