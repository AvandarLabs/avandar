import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { PlannerColumns } from "./PlannerColumns";
import type { Input } from "./PersonLedSupportCalendar.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** Fixed tabletop grid keeps all authored commitments in discrete cells. */
export function PlannerGrid({ input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <StockRect
        x={180}
        y={110}
        width={620}
        height={355}
        rx={scales.corner(tokens.corner.panel)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <PlannerColumns input={input} />
      {input.timeBands.map((band, row) => {
        return (
          <LabelSlots
            key={band.id}
            labels={[
              [
                band.label,
                62,
                244 + (row * 228) / input.timeBands.length,
                155,
                12,
                3,
              ],
            ]}
          />
        );
      })}
    </g>
  );
}
