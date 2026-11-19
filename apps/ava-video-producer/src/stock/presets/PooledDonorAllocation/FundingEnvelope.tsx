import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./PooledDonorAllocation.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  index: number;
  frame: number;
  accent: string;
  allocatedCredits: number;
};
/** Funding-request envelope stays below every contributed identity mark. */
export function FundingEnvelope({
  input,
  index,
  frame,
  accent,
  allocatedCredits,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const request = input.requests[index];
  const width = 880 / input.requests.length;
  const x = 40 + index * width;
  const offset =
    input.envelopeArrangement === "fan"
      ? Math.abs(index - (input.requests.length - 1) / 2) * 12
      : 0;
  const top = 425 + offset;
  return (
    <g>
      <g data-envelope={request.id} data-edge={top}>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${x} ${top + 12 * (1 - motion.ramp(frame, 118, motion.scale(14), motion.exit.easing))} H${x + width - 18} V${top + 42} H${x} Z M${x} ${top} L${x + width / 2 - 9} ${top + 28} L${x + width - 18} ${top}`,
          }}
          profile={tokens.sketch.shape}
          fill={tokens.color.surface}
          stroke={accent}
        />
      </g>
      <text
        x={x + 12}
        y={top + 27}
        fill={tokens.color.highlight}
        fontSize={tokens.text.graphic.value.fontSize}
        fontFamily={tokens.text.graphic.value.fontFamily}
      >
        {index + 1}
      </text>
      <FitText
        text={request.label}
        x={x + 12}
        y={497}
        width={width - 42}
        fontSize={12}
        maxLines={3}
        normalizeWhitespace
        breakLongWords
      />
      {input.showAllocationTotals ? (
        <text
          data-allocation-total={request.id}
          x={x + width - 36}
          y={top + 27}
          textAnchor="end"
          fill={accent}
          fontSize={tokens.text.graphic.value.fontSize}
          fontFamily={tokens.text.graphic.value.fontFamily}
        >
          {allocatedCredits}
        </text>
      ) : undefined}
    </g>
  );
}
