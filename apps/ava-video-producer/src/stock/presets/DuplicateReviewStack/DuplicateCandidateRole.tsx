import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./DuplicateReviewStack.schema";
import type { getDuplicateCardLayoutFromGroupAndFrame } from "./getDuplicateCardLayoutFromGroupAndFrame";
import type { ReactNode } from "react";
type Props = {
  frame: number;
  input: Input;
  group: Input["groups"][number];
  layout: ReturnType<typeof getDuplicateCardLayoutFromGroupAndFrame>;
  accent: string;
};
/** Each comparison card owns its role in a reserved three-line caption slot. */
export function DuplicateCandidateRole({
  frame,
  input,
  group,
  layout,
  accent,
}: Readonly<Props>): ReactNode {
  if (
    input.finalView !== "comparison-pair" ||
    group.retainedId === null ||
    frame <= 90
  ) {
    return null;
  }
  const { x, y, width, height, isRetained } = layout;
  const color = isRetained ? accent : STOCK.muted;
  return (
    <g opacity={ramp(frame, 90, 10)}>
      <path d={`M${x + 4} ${y + height}v4`} stroke={color} />
      <FitText
        text={isRetained ? input.labels.retained : input.labels.alternatives}
        x={x + 4}
        y={y + height + 16}
        width={width - 8}
        fontSize={12}
        maxLines={3}
        color={color}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
