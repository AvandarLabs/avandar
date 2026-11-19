import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = {
  label: string;
  requestX: number;
  requestY: number;
  accent: string;
};
/**
 * Pending copy stays below the tray and connects to the moving request group.
 */
export function PendingCaption({
  label,
  requestX,
  requestY,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  return (
    <g>
      <LabelSlots labels={[[label, 60, 438, requestX - 84, 12, 7]]} />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${requestX - 16} 438 H${requestX - 6} V${requestY + 66} H${requestX}`,
        }}
        profile={tokens.sketch.shape}
        data-pending-link=""
        fill="none"
        stroke={accent}
        strokeOpacity={atomic.opacity["65"]}
      />
    </g>
  );
}
