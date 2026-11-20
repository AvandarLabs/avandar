import { mix, ramp } from "../../../motion";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./ExpectationOverlayCheck.schema";
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
/** The expected sheet's corner before the corner style scales it. */
const SHEET_CORNER = 2;

function _getSheetGeometry({
  frame,
  y,
  input,
  state,
  motion,
}: Readonly<
  Pick<Props, "frame" | "y" | "input" | "state"> & { motion: VideoMotion }
>) {
  const registration = ramp(
    frame,
    43,
    motion.scale(REGISTER_FRAMES),
    motion.travel.easing,
  );
  const separation = ramp(
    frame,
    89,
    motion.scale(SEPARATE_FRAMES),
    motion.travel.easing,
  );
  const top =
    (input.sheetMotion === "hinge"
      ? y + 20
      : mix(registration, y - 45, y + 20)) -
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
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

/** The expected sheet itself, folded flat on its hinge until it registers. */
function HingedSheet({
  isHinge,
  scale,
  accent,
}: Readonly<{ isHinge: boolean; scale: number; accent: string }>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g data-hinge={isHinge} transform={`matrix(1 0 0 ${scale} 0 0)`}>
      <StockRect
        width={390}
        height={39}
        rx={scales.corner(SHEET_CORNER)}
        fill={accent}
        fillOpacity={scales.wash(atomic.opacity["6"])}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
    </g>
  );
}
