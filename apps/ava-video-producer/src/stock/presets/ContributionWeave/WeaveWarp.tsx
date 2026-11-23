import { Motion } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./ContributionWeave.schema";
import type { ReactNode } from "react";

type Props = {
  contributor: Input["warp"][number];
  index: number;
  numWarp: number;
  input: Input;
  frame: number;
  id: string;
};
/** Frames a warp band takes to draw down the loom. */
const TENSION_FRAMES = 14;
/** Frames a warp band takes to fade in. */
const FADE_FRAMES = 10;
/** Each vertical contribution tensions once and retains its own outer end. */
export function WeaveWarp({
  contributor,
  index,
  numWarp,
  input,
  frame,
  id,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const x = 400 + (index * 400) / (numWarp - 1);
  const band = {
    x: x - 24,
    y: 180,
    width: 48,
    height:
      300 *
      Motion.ramp({
        frame,
        at: 18 + index * motion.stagger.list,
        dur: motion.scale(TENSION_FRAMES),
        easing: motion.entrance.easing,
      }),
    fill: `url(#${id}-band-${index})`,
  };
  const end = { ...band, y: 150, height: 30 };
  return (
    <g
      opacity={Motion.ramp({
        frame,
        at: 14 + index * motion.stagger.list,
        dur: motion.scale(FADE_FRAMES),
        easing: motion.reveal.easing,
      })}
    >
      <rect data-warp-band={contributor.id} {...band} />
      {input.showContributorEnds ? (
        <rect data-contributor-end={contributor.id} {...end} />
      ) : undefined}
      {input.showLabels ? (
        <FitText {..._createWarpLabel({ text: contributor.label, x })} />
      ) : undefined}
    </g>
  );
}
/** The contributor's label, centred above its warp band. */
function _createWarpLabel({
  text,
  x,
}: Readonly<{
  text: string;
  x: number;
}>) {
  return {
    text,
    x,
    y: 88,
    width: 190,
    fontSize: 12 as const,
    maxLines: 3,
    anchor: "middle" as const,
    breakLongWords: true,
    normalizeWhitespace: true,
  };
}
