import { FitText } from "../../primitives/FitText/FitText";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./SharedFoundation.schema";
import type { ReactNode } from "react";
/** Inputs for ApproachTrait. */
type Props = {
  frame: number;
  approach: Input["approaches"][number];
  index: number;
  x: number;
  showTrait: boolean;
};

/** A distinguishing trait stays attached to its approach during the reveal. */
export function ApproachTrait({
  frame,
  approach,
  index,
  x,
  showTrait,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  return (
    <>
      <g
        {...{ [`data-trait-${index}`]: true }}
        opacity={showTrait ? 1 : 1 - motion.ramp(frame, 96, motion.scale(24))}
      >
        <FitText
          text={approach.distinction}
          x={x + 180}
          y={285}
          width={320}
          fontSize={16}
          maxLines={3}
          anchor="middle"
          color={tokens.color.textMuted}
          breakLongWords
          normalizeWhitespace
        />
      </g>
    </>
  );
}
