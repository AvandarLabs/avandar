import { Orb } from "../../../chrome/chrome";
import { Motion } from "../../../motion";
import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../../videoTheme/videoThemeHelpers";
import { TOAST_AT } from "../timeline";
import { PublishedToastText } from "./PublishedToastText";
import { SidePanelShared } from "./SidePanelShared";
import type { ReactNode } from "react";

type Props = {
  frame: number;
};
/**
 * The hero beat of the last phase. One per phase: if everything is
 * animated, nothing reads as animated. A spring, because this lands in a
 * slot rather than travelling.
 */
export function PublishedToast({ frame }: Readonly<Props>): ReactNode {
  const { semantic, mantine } = useVideoTheme();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const scene = semantic.color.scene;
  return (
    <div
      style={{
        marginTop: mantine.spacing["34"],
        padding: mantine.spacing["22"],
        borderRadius: scales.corner(semantic.corner.card),
        background: scene.brandSoft,
        border: `${scales.stroke(semantic.stroke.hairline)}px solid ${scene.brand}`,
        display: "flex",
        gap: mantine.spacing["14"],
        alignItems: "center",
        opacity: motion.ramp(
          frame,
          TOAST_AT,
          motion.chip,
          motion.reveal.easing,
        ),
        transform: `translateY(${Motion.mix({
          t: motion.pop(frame, TOAST_AT),
          from: SidePanelShared.RISE.toast,
          to: 0,
        }).toFixed(2)}px)`,
      }}
    >
      <Orb size={22} />
      <PublishedToastText />
    </div>
  );
}
