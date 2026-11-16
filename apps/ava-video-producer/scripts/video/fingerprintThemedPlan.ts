import { makeResolvedVideoThemeFromSnapshot } from "../../src/videoTheme/videoThemeSnapshotHelpers/videoThemeSnapshotHelpers";
import { fingerprintPlan } from "../lib/planHelpers/fingerprintPlan";
import { ROOT } from "./video.constants";
import type { Storyboard } from "../../src/storyboard/schema/schema";
import type { VideoThemeSnapshot } from "../../src/videoTheme/videoThemeSnapshotHelpers/videoThemeSnapshotHelpers";

/** The plan fingerprint plus the resolved theme hash, so a preview only unlocks a render of the same theme. */
export async function fingerprintThemedPlan({
  plan,
  filename,
  workspace,
  theme,
}: Readonly<{
  plan: Storyboard;
  filename: string;
  workspace: string;
  theme: VideoThemeSnapshot;
}>) {
  return {
    ...(await fingerprintPlan(ROOT, filename, plan, workspace)),
    themeHash: makeResolvedVideoThemeFromSnapshot(theme, [plan.id]).hash,
  };
}
