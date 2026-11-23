import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { PlannerBookingLabel } from "./PlannerBookingLabel";
import type { Input } from "./PersonLedSupportCalendar.schema";
import type { ReactNode } from "react";

type Props = {
  commitment: Input["commitments"][number];
  x: number;
  y: number;
  width: number;
  height: number;
  accent: string;
  showLabel?: boolean;
  isProposal?: boolean;
};
/**
 * One actual appointment has an outlined proposal or a filled agreed surface.
 */
export function PlannerBooking({
  commitment,
  x,
  y,
  width,
  height,
  accent,
  showLabel = true,
  isProposal = false,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <StockRect
        data-booking={commitment.id}
        data-kind={commitment.kind}
        x={x}
        y={y}
        width={width}
        height={height}
        rx={scales.corner(5)}
        fill={isProposal ? "none" : tokens.color.elevated}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        strokeDasharray={isProposal ? atomic.dash.notch.join(" ") : undefined}
      />
      {showLabel ? (
        <PlannerBookingLabel
          label={commitment.label}
          bookingId={commitment.id}
          {...{ x, y, width, height, accent, isProposal }}
        />
      ) : undefined}
    </g>
  );
}
