import { mix } from "../../../motion";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { SelectionCopy } from "./SelectionCopy";
import { SelectionMarker } from "./SelectionMarker";
import type { Input } from "./RejectAndReplace.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  accent: string;
  isReplacement: boolean;
};
/**
 * One option retains a legible rationale as the shared selection role changes.
 */
export function SelectionOption({
  frame,
  input,
  accent,
  isReplacement,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const move = motion.ramp(frame, 48, motion.scale(30), motion.travel.easing);
  const entry = motion.ramp(
    frame,
    isReplacement ? 78 : 12,
    motion.scale(isReplacement ? 30 : 18),
    motion.travel.easing,
  );
  const x = isReplacement ? mix(entry, 1000, 480) : mix(move, 480, 156);
  const width = isReplacement ? 320 : mix(move, 320, 296);
  const panel = {
    x: -width / 2,
    y: 210,
    width,
    height: 304,
    rx: scales.corner(tokens.corner.panel),
  };
  return (
    <g
      data-option={isReplacement ? "replacement" : "rejected"}
      opacity={entry}
      transform={`translate(${x} 0)`}
    >
      <StockRect
        {...panel}
        fill={tokens.color.surface}
        stroke={isReplacement ? accent : tokens.color.line}
      />
      <SelectionMarker
        {...{ frame, accent, isReplacement }}
        rejectionMark={input.rejectionMark}
      />
      <SelectionCopy {...{ frame, input, isReplacement }} />
    </g>
  );
}
