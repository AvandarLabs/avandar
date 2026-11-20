import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = { frame: number; partition: "door" | "screen" };
/** Both separators close only after the supporter clears the doorway. */
export function ConversationPartition({
  frame,
  partition,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const closure = motion.ramp(
    frame,
    86,
    motion.scale(22),
    motion.entrance.easing,
  );
  return (
    <g data-partition={partition} data-closed={closure === 1}>
      <SketchedShape
        shape={{ kind: "path", d: "M623 150 V310 M623 450 V510" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(6)}
      />
      {partition === "screen" ? (
        <StockRect
          data-separator-shape="screen"
          x={617}
          y={310}
          width={12}
          height={140 * closure}
          fill={tokens.color.accentAlt}
          fillOpacity={scales.wash(atomic.opacity["45"])}
          stroke={tokens.color.accentAlt}
        />
      ) : (
        <ClosingDoor closure={closure} />
      )}
    </g>
  );
}

/** A door swinging shut across the doorway. */
function ClosingDoor({ closure }: Readonly<{ closure: number }>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g data-separator-shape="door">
      <SketchedShape
        shape={{
          kind: "path",
          d: `M623 310 L${623 + 90 * (1 - closure)} ${310 + 140 * closure} L${631 + 90 * (1 - closure)} ${310 + 140 * closure} L631 310 Z`,
        }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={tokens.color.accentAlt}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
    </g>
  );
}
