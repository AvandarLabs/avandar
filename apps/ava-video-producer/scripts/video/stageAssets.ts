import fs from "node:fs/promises";
import path from "node:path";
import { assetReferences, publicAsset } from "../lib/planHelpers/planHelpers";
import { ROOT } from "./video.constants";
import type { Storyboard } from "../../src/storyboard/schema/schema";

/** Preview only explicitly referenced assets, never the repository root. */
export async function stageAssets(
  plan: Storyboard,
  directory: string,
  workspace: string,
): Promise<string> {
  const target = path.join(directory, "bundle-public");
  await fs.mkdir(target);
  await fs.mkdir(path.join(target, "fonts"));
  await fs.copyFile(
    await publicAsset(ROOT, "fonts/figtree-latin.woff2"),
    path.join(target, "fonts/figtree-latin.woff2"),
  );
  for (const asset of assetReferences(plan)) {
    const destination = path.join(target, asset);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(
      await publicAsset(workspace, asset),
      destination,
      fs.constants.COPYFILE_EXCL,
    );
  }
  return target;
}
