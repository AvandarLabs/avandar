import { abs } from "../../chrome/abs";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../videoTheme/videoThemeHelpers";
import { PUBLISH, PUBLISH_CLICK, ROWS_AT } from "./timeline";
import type { ReactNode } from "react";

type Props = { frame: number };

/** Frames after the rows land that the button arrives. A cue, not a length. */
const PUBLISH_DELAY = 10;
/** How far the button rises as it arrives, in pixels. */
const PUBLISH_RISE = 10;

/** The publish phase: the button entering with the side panel, then
 *  answering the click that sends the report. */
export function PublishButton({ frame }: Readonly<Props>): ReactNode {
  const { semantic, mantine, atomic } = useVideoTheme();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const publishIn = motion.enter(frame, ROWS_AT + PUBLISH_DELAY, {
    dur: motion.panel,
    y: PUBLISH_RISE,
  });
  return (
    <div
      style={{
        ...abs(PUBLISH),
        borderRadius: scales.corner(semantic.corner.card),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: mantine.fontSizes["2xl"],
        fontWeight: atomic.fontWeight.semibold,
        color: mantine.white,
        background: semantic.color.scene.brand,
        ...publishIn,
        // Two transforms on one element: compose them into one string,
        // never spread one over the other. The spread would silently
        // drop whichever came first, and the entrance would vanish for
        // the eight frames the press is active. A fade or cut entrance
        // style has no transform of its own.
        transform: [
          publishIn.transform,
          `scale(${motion.press(frame, PUBLISH_CLICK).toFixed(4)})`,
        ]
          .filter(Boolean)
          .join(" "),
      }}
    >
      Publish report
    </div>
  );
}
