import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { x: number; width: number };
/** Exact byte-width sender and receiver rails remain after each transfer. */
export function ByteIntervalRails({ x, width }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g>
      {" "}
      <StockRect
        x={x}
        y={180}
        width={width}
        height={54}
        fill="none"
        stroke={tokens.color.line}
      />
      <StockRect
        x={x}
        y={380}
        width={width}
        height={54}
        fill="none"
        stroke={tokens.color.line}
      />
    </g>
  );
}
