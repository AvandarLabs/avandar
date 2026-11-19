import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = { label: string; frame: number; accent: string };
/** A named receiving tray denotes preparation for handoff. */
export function DestinationTray({
  label,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  return (
    <g
      data-destination="tray"
      opacity={motion.ramp(frame, 104, motion.scale(32))}
    >
      <SketchedShape
        shape={{ kind: "path", d: "M64 544v34h832v-34M80 544h800" }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <FitText
        text={label}
        x={480}
        y={566}
        width={720}
        fontSize={14}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
        anchor="middle"
        color={accent}
      />
    </g>
  );
}
