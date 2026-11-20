import { validateMedia } from "../lib/mediaHelpers";
import {
  getAssetReferencesFromPlan,
  getPublicAssetPathFromAsset,
} from "../lib/planHelpers/planHelpers";
import type { Storyboard } from "../../src/storyboard/schema/schema";

/** Checks that a plan's assets exist and its media timing fits its cues. */
export async function validate(
  plan: Storyboard,
  workspace: string,
): Promise<void> {
  for (const asset of getAssetReferencesFromPlan(plan))
    // Reject the first unsafe asset before resolving later paths or probing any
    // media.
    // react-doctor-disable-next-line async-await-in-loop
    await getPublicAssetPathFromAsset(workspace, asset);
  await validateMedia(plan, workspace);
}
