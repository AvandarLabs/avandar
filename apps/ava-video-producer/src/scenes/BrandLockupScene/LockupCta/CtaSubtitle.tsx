import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
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
  subtitle: string;
};
/** Introduces the supporting subtitle on the CTA cue for `LockupCta`. */
export function CtaSubtitle({
  frame,
  box,
  beats,
  subtitle,
}: Readonly<Props>): ReactNode {
  const tokens = useVideoTheme().semantic;
  const motion = useVideoMotion();
  return (
    <div
      style={{
        ...LockupCtaShared.buildCtaLineStyle({
          box,
          top: 0.43,
          fontSize: box.height * 0.042,
        }),
        color: tokens.color.scene.mutedForeground,
        ...motion.enter(frame, beats.subtitleAt, { y: 0 }),
      }}
    >
      {subtitle}
    </div>
  );
}
