import { mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./PairedContrast.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  accent: string;
  alternative: Input["alternatives"][number];
  index: number;
};

/** Frames the halves take to slide apart. */
const SEPARATE_FRAMES = 24;
/** Equal halves slide apart while their labels keep the same fixed size. */
export function ContrastAlternative({
  frame,
  accent,
  alternative,
  index,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const separation = ramp(
    frame,
    12,
    motion.scale(SEPARATE_FRAMES),
    motion.travel.easing,
  );
  const panel = {
    x: 48 + index * 512,
    y: 146,
    width: 352,
    height: 408,
    rx: scales.corner(tokens.corner.panel),
  };
  const label = {
    text: alternative.label,
    x: 224 + index * 512,
    y: 178,
    width: 312,
    fontSize: 20 as const,
    maxLines: 3,
  };
  return (
    <g
      data-alternative={alternative.id}
      opacity={separation}
      transform={`translate(${mix(separation, index ? -100 : 100, 0)} 0)`}
    >
      <StockRect
        {...panel}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <g aria-label={alternative.label}>
        <FitText
          {...label}
          breakLongWords
          normalizeWhitespace
          anchor="middle"
          color={index ? tokens.color.positive : accent}
        />
      </g>
    </g>
  );
}
