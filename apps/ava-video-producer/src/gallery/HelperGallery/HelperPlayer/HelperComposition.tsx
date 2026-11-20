// Registers the bundled faces the theme's text roles name.
import "../../../fonts";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { HELPER_DEMOS } from "../demos/helperDemoRegistry";
import { HELPER_CATALOG } from "../helperCatalog";
import { HelperVideoTheme } from "./HelperVideoTheme/HelperVideoTheme";
import type { VideoThemeSnapshot } from "../../../videoTheme/videoThemeSnapshotHelpers/videoThemeSnapshotHelpers";
import type { HelperDemoId } from "../helperDemoIds";
import type { ReactNode } from "react";
/**
 * One helper's live preview at the player's current frame, drawn in the
 * video theme (see `HelperVideoTheme`). The preview calls the real helper;
 * nothing here reimplements motion.
 */
export function HelperComposition({
  helperId,
  theme,
}: {
  helperId: string;
  theme?: VideoThemeSnapshot;
}): ReactNode {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const helper = HELPER_CATALOG.helpers.find((entry) => {
    return entry.id === helperId;
  });
  if (!helper) {
    throw new Error(`Unknown helper preview: ${helperId}`);
  }
  const Demo = HELPER_DEMOS[helper.demo.id as HelperDemoId];
  return (
    <HelperVideoTheme helperId={helperId} theme={theme}>
      <Demo frame={frame} frames={durationInFrames} helper={helper} />
    </HelperVideoTheme>
  );
}
