import { Motion } from "../../../../motion";
import { LiteralDataText } from "../../../primitives/LiteralDataText/LiteralDataText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { HingedSheet } from "./HingedSheet";
import type { VideoMotion } from "../../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "../ExpectationOverlayCheck.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  y: number;
  input: Input;
  item: Input["tests"][number];
  state: string;
  accent: string;
};
/** Frames the expected sheet takes to register over the observed slot. */
const REGISTER_FRAMES = 45;
/** Frames a mismatching sheet takes to lift away from its slot. */
const SEPARATE_FRAMES = 19;
function _getSheetGeometry({
  frame,
  y,
  input,
  state,
  motion,
}: Readonly<
  Pick<Props, "frame" | "y" | "input" | "state"> & {
    motion: VideoMotion;
  }
>) {
  const registration = Motion.ramp({
    frame,
    at: 43,
    dur: motion.scale(REGISTER_FRAMES),
    easing: motion.travel.easing,
  });
  const separation = Motion.ramp({
    frame,
    at: 89,
    dur: motion.scale(SEPARATE_FRAMES),
    easing: motion.travel.easing,
  });
  const top =
    (input.sheetMotion === "hinge"
      ? y + 20
      : Motion.mix({
          t: registration,
          from: y - 45,
          to: y + 20,
        })) -
    (state === "match" ? 0 : 39) * separation;
  const scale =
    input.sheetMotion === "hinge"
      ? Math.cos(((1 - registration) * 80 * Math.PI) / 180)
      : 1;
  return { registration, top, scale };
}
/** The upper edge stays fixed during a hinge, then the sheets register. */
export function ExpectedSheet({
  frame,
  y,
  input,
  item,
  state,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { registration, top, scale } = _getSheetGeometry({
    frame,
    y,
    input,
    state,
    motion,
  });
  return (
    <g>
      <g data-expected-sheet={item.id} transform={`translate(510 ${top})`}>
        <HingedSheet
          isHinge={input.sheetMotion === "hinge"}
          scale={scale}
          accent={accent}
        />
        <g opacity={input.sheetMotion === "hinge" ? registration : 1}>
          <LiteralDataText value={item.expected} x={15} y={24} color={accent} />
        </g>
      </g>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M490 ${y - 20} H500 V${top + 6} H510 M490 ${y + 65} H500 V${y + 50} H510`,
        }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
        fill="none"
      />
    </g>
  );
}
