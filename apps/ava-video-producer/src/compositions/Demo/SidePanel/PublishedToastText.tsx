import { useVideoTheme } from "../../../videoTheme/videoThemeHelpers";
import type { ReactNode } from "react";
/** States the publication result and audience size for `PublishedToast`. */
export function PublishedToastText(): ReactNode {
  const { semantic, mantine, atomic } = useVideoTheme();
  return (
    <div>
      <div
        style={{
          fontSize: mantine.fontSizes.xl,
          fontWeight: atomic.fontWeight.semibold,
        }}
      >
        Report published
      </div>
      <div
        style={{
          fontSize: mantine.fontSizes.sm,
          color: semantic.color.scene.mutedForeground,
        }}
      >
        Shared with 4 people
      </div>
    </div>
  );
}
