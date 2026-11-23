import { StockRect } from "../../../primitives/StockRect";
import { QuarantinedRows } from "../QuarantinedRows";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getQuarantineStateFromFrame } from "../getQuarantineStateFromFrame";
import type { ReactNode } from "react";

type Props = {
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  rows: ReturnType<typeof getQuarantineStateFromFrame>["rows"];
};
/** Frames the committed table rows beneath the read shutter. */
export function QuarantineTableFrame({
  tokens,
  scales,
  rows,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <StockRect
        x={100}
        y={146}
        width={540}
        height={324}
        rx={scales.corner(tokens.corner.cell)}
        fill="none"
        stroke={tokens.color.line}
      />
      <QuarantinedRows rows={rows} x={110} />
    </>
  );
}
