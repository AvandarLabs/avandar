import { Box } from "@remotion/rough-notation";
import { useVideoTokens } from "../videoTheme/useVideoTheme";
import css from "./ContinuityOverlays.module.css";
import type { ReactNode } from "react";

/**
 * A stationary sketch border for the enclosing editorial card or token, in the
 * theme's box sketch profile.
 */
export function ContinuityBoxOutline(): ReactNode {
  const { sketch, stroke } = useVideoTokens();
  const profile = sketch.box;
  if (profile.roughness === 0) {
    return null;
  }
  return (
    <div className={css.boxOutline}>
      <Box
        progress={1}
        roughness={profile.roughness}
        seed={profile.seed}
        padding={{ top: 0, right: 0, bottom: 0, left: 0 }}
        strokeWidth={stroke.default}
        style={{ width: "100%", height: "100%" }}
      >
        <div className={css.boxOutlineSize} />
      </Box>
    </div>
  );
}
