import { abs } from "../../../chrome/abs";
import { Orb } from "../../../chrome/chrome";
import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../../videoTheme/videoThemeHelpers";
import { APP_IN, RESULTS, ROWS_AT, SIDE } from "../timeline";
import { ResultsPanelShared } from "./ResultsPanelShared/ResultsPanelShared";
import type { ReactNode } from "react";

type Props = { frame: number };

/**
 * Without this the clip spends three seconds on a near-black frame with one
 * text field in it, which reads as a broken render rather than as an app
 * waiting for input. It also gives the results something to dissolve
 * *over*: the outgoing state is still on screen underneath while the
 * incoming one fades up, so fading this out first and the panels in
 * afterwards would put a hole between them.
 */
export function EmptyState({ frame }: Readonly<Props>): ReactNode {
  const { semantic, mantine } = useVideoTheme();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const easing = motion.reveal.easing;
  const scene = semantic.color.scene;
  return (
    <div
      style={{
        ...abs({
          x: RESULTS.x,
          y: RESULTS.y,
          w: SIDE.x + SIDE.w - RESULTS.x,
          h: RESULTS.h,
        }),
        borderRadius: scales.corner(semantic.corner.scene),
        border: `${scales.stroke(semantic.stroke.hairline)}px dashed ${scene.border}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: mantine.spacing["2xs"],
        opacity:
          motion.ramp(
            frame,
            APP_IN + ResultsPanelShared.CUES.emptyState,
            motion.sheet,
            easing,
          ) *
          (1 - motion.ramp(frame, ROWS_AT, motion.chip, easing)),
      }}
    >
      <Orb size={34} />
      <div
        style={{
          fontSize: mantine.fontSizes["2xl"],
          color: scene.mutedForeground,
        }}
      >
        Results will appear here
      </div>
    </div>
  );
}
