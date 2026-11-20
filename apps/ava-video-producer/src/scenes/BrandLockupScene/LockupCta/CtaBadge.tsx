import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../../videoTheme/useVideoTheme";
import { LockupCtaShared } from "./LockupCtaShared/LockupCtaShared";
import {
  type CtaLineBox,
  type CtaBeats,
} from "./LockupCtaShared/LockupCtaShared.types";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  box: CtaLineBox;
  beats: CtaBeats;
  badge: string;
};
/** The outlined badge, arriving last. */
export function CtaBadge({
  frame,
  box,
  beats,
  badge,
}: Readonly<Props>): ReactNode {
  const tokens = useVideoTheme().semantic;
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const scene = tokens.color.scene;
  return (
    <div
      style={{
        ...LockupCtaShared.buildCtaLineStyle({
          box,
          top: 0.86,
          fontSize: box.height * 0.022,
        }),
        ...motion.enter(frame, beats.badgeAt, { y: 0 }),
      }}
    >
      <span
        style={{
          padding: "0.35em 0.9em",
          border: `${scales.stroke(tokens.stroke.hairline)}px solid ${scene.border}`,
          borderRadius: scales.corner(tokens.corner.pill),
          color: scene.mutedForeground,
        }}
      >
        {badge}
      </span>
    </div>
  );
}
