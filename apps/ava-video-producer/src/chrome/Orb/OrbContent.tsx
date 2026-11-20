import { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import { useVideoProps, useVideoTokens } from "../../videoTheme/useVideoTheme";
import { OrbShared } from "./OrbShared/OrbShared";
import type { ReactNode } from "react";
/** Draws the themed circular brand mark and outline for `Orb`. */
export function OrbContent({ size }: { size: number }): ReactNode {
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
        background: `radial-gradient(${OrbShared.HIGHLIGHT_AT}, ${tokens.color.scene.brandStrong}, ${tokens.color.scene.brand})`,
        boxShadow: ring,
        flexShrink: 0,
      }}
    />
  );
}
