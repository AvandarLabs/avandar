import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DisclosureFieldShared } from "./DisclosureFieldShared";
import type { ReactNode } from "react";

type Props = { isCopy: boolean; accent: string };

/** The field's row, raised and outlined in the accent while it is a copy. */
export function FieldOutline({ isCopy, accent }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <StockRect
      x={10}
      y={0}
      width={340}
      height={64}
      rx={scales.corner(DisclosureFieldShared.FIELD_CORNER)}
      fill={isCopy ? tokens.color.elevated : tokens.color.ground}
      stroke={isCopy ? accent : tokens.color.line}
    />
  );
}
