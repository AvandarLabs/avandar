import { validateMedia } from "../lib/mediaHelpers";
import { assetReferences, publicAsset } from "../lib/planHelpers";
import type { Storyboard } from "../../src/storyboard/schema/schema";

/** Checks that a plan's assets exist and its media timing fits its cues. */
export async function validate(
  plan: Storyboard,
  workspace: string,
): Promise<void> {
  for (const asset of assetReferences(plan))
    await publicAsset(workspace, asset);
  await validateMedia(plan, workspace);
}
