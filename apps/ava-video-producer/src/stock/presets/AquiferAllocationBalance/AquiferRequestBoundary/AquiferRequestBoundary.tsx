import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
};

/** Renders the surface with authored geometry. */
export function AquiferRequestBoundary({
  scales,
  tokens,
  atomic,
}: Readonly<Props>): ReactNode {
  return (
    <StockRect
      x={32}
      y={320}
      width={210}
      height={78}
      rx={scales.corner(tokens.corner.cell)}
      fill="none"
      stroke={tokens.color.inactive}
      strokeDasharray={atomic.dash.wide.join(" ")}
    />
  );
}
