import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getBufferTransferPointFromLocation } from "./getBufferTransferPointFromLocation";
import type { Input } from "./DistanceBufferEnvelope.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  location: Input["locations"][number];
  index: number;
  ledgerIndex: number;
  frame: number;
  accent: string;
};

const CLASSIFY_AT = 106;
const CLASSIFY_FRAMES = 23;
/** The frame every qualifying token is counted as in the ledger. */
const INCLUDED_AT = 139;
/**
 * Only qualifying tokens enter the ledger and display their stable source key.
 */
export function BufferClassificationToken({
  input,
  location,
  index,
  ledgerIndex,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const progress = motion.ramp(
    frame,
    CLASSIFY_AT + index * motion.stagger.list,
    motion.scale(CLASSIFY_FRAMES),
    motion.travel.easing,
  );
  const point = getBufferTransferPointFromLocation({
    location,
    ledgerIndex,
    progress,
  });
  const included =
    Math.hypot(location.x - input.origin.x, location.y - input.origin.y) <=
    input.radiusUnits;
  return included ? (
    <g>
      <circle
        data-ledger-token={location.id}
        data-included-id={frame >= INCLUDED_AT ? location.id : undefined}
        cx={point.x}
        cy={point.y}
        r={8}
        fill={accent}
      />
      {progress === 1 ? <TokenKey point={point} index={index} /> : undefined}
    </g>
  ) : undefined;
}

/** The token's stable source key, once it has landed in the ledger. */
function TokenKey({
  point,
  index,
}: Readonly<{
  point: Readonly<{ x: number; y: number }>;
  index: number;
}>): ReactNode {
  const { color, text } = useGraphicTokens();
  return (
    <text
      x={point.x}
      y={point.y + 4}
      fontSize={text.graphic.data.fontSize}
      fontWeight={text.graphic.data.fontWeight}
      textAnchor="middle"
      fill={color.ground}
    >
      {index + 1}
    </text>
  );
}
