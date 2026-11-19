import { FitText } from "../../primitives/FitText/FitText";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = {
  text: string;
  labelRole: "original" | "result" | "change";
  placement: "primary" | "retained" | "edit";
  x: number;
  y: number;
  opacity?: number;
  color?: string;
  /** A smaller sublabel inside a row, rather than a lane heading. */
  isSublabel?: boolean;
};
/** A supplied label stays attached to the value lane it actually describes. */
export function CleanupLaneHeading({
  text,
  labelRole,
  placement,
  x,
  y,
  opacity = 1,
  color,
  isSublabel = false,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g
      data-cleanup-label={labelRole}
      data-label-placement={placement}
      opacity={opacity}
    >
      <FitText
        text={text}
        x={x}
        y={y}
        width={352}
        fontSize={isSublabel ? 12 : 14}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
        color={color ?? tokens.color.textMuted}
      />
    </g>
  );
}
