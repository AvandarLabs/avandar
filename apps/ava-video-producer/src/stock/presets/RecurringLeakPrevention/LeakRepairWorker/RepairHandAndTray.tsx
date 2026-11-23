import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../RecurringLeakPrevention.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  frame: number;
  accent: string;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  trayX: number;
  handX: number;
  handY: number;
};

/** Renders the repair hand and tray in authored paint order. */
export function RepairHandAndTray(options: Readonly<Props>): ReactNode {
  return (
    <>
      <circle
        data-repair-hand={options.frame >= 63 ? "true" : undefined}
        cx={options.handX}
        cy={options.handY}
        r={5}
        fill={options.accent}
      />
      <g opacity={options.motion.ramp(options.frame, 39, options.motion.whip)}>
        <StockRect
          data-catch-tray="true"
          x={options.trayX - 80}
          y={430}
          width={160}
          height={24}
          rx={options.scales.corner(5)}
          fill={options.tokens.color.surface}
          stroke={options.accent}
          strokeWidth={options.scales.stroke(options.tokens.stroke.emphasis)}
        />
      </g>
    </>
  );
}
