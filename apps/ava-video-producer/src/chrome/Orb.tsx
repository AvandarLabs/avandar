import { StageThemeBoundary } from "../scenes/stageTheme/StageThemeBoundary";
import { useVideoShapeScales } from "../videoTheme/useVideoShapeScales";
import { useVideoProps, useVideoTokens } from "../videoTheme/useVideoTheme";
import type { ReactNode } from "react";

/** Where the orb's highlight sits, as a radial gradient position. */
const HIGHLIGHT_AT = "circle at 30% 30%";

/**
 * Stand-in for a product mark. Replace with your own. A scene palette
 * gradient inside a `components.Orb` focus ring.
 */
export function Orb({ size = 28 }: { size?: number }): ReactNode {
  return (
    <StageThemeBoundary>
      <OrbContent size={size} />
    </StageThemeBoundary>
  );
}

function OrbContent({ size }: { size: number }): ReactNode {
  const { ringWidth, ringColor } = useVideoProps("Orb", {});
  const tokens = useVideoTokens();
  const scales = useVideoShapeScales();
  const ring = `0 0 0 ${scales.stroke(ringWidth)}px ${ringColor}`;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: scales.corner(tokens.corner.pill),
        background: `radial-gradient(${HIGHLIGHT_AT}, ${tokens.color.scene.brandStrong}, ${tokens.color.scene.brand})`,
        boxShadow: ring,
        flexShrink: 0,
      }}
    />
  );
}
