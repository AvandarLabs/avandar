import { useVideoMotion } from "../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../videoTheme/useVideoShapeScales";
import { useVideoTheme, useVideoTokens } from "../videoTheme/useVideoTheme";
import { TitleCardShared } from "./TitleCardShared/TitleCardShared";
import type { ReactNode } from "react";
/** Grows the accent rule below the title for `TitleCardContent`. */
export function TitleCardRule({
  frame,
}: Readonly<{ frame: number }>): ReactNode {
  const tokens = useVideoTokens();
  const { spacing } = useVideoTheme().mantine;
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  return (
    <div
      style={{
        width: 120,
        height: 3,
        borderRadius: scales.corner(tokens.corner.pill),
        marginTop: spacing["26"],
        background: tokens.color.scene.brand,
        transformOrigin: "center",
        transform: `scaleX(${motion
          .ramp(
            frame,
            TitleCardShared.RULE_IN,
            motion.sheet,
            motion.entrance.easing,
          )
          .toFixed(3)})`,
      }}
    />
  );
}
