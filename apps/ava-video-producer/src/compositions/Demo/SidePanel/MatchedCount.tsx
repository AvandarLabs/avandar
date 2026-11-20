import { useVideoTheme } from "../../../videoTheme/useVideoTheme";
import type { ReactNode } from "react";
/** Displays the formatted matching-result total for `SidePanel`. */
export function MatchedCount({ shown }: { shown: number }): ReactNode {
  const { atomic, mantine } = useVideoTheme();
  return (
    <div
      style={{
        fontSize: mantine.fontSizes["76"],
        fontWeight: atomic.fontWeight.bold,
        letterSpacing: `${atomic.letterSpacing.counter}em`,
        marginTop: mantine.spacing["6"],
        // Weight and size stay stepped. Tweening fontSize reflows the
        // line every frame; this number changes its value, not its type.
      }}
    >
      {shown.toLocaleString("en-US")}
    </div>
  );
}
