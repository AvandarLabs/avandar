import { LiteralDataText } from "../../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Props } from "./SpineObservationShared.types";
import type { ReactNode } from "react";
/** The observation's card with its own ID over the entity it names. */
export function ObservationCard({
  observation,
  y,
}: Readonly<{ observation: Props["observation"]; y: number }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <>
      <StockRect
        x={50}
        y={y}
        width={340}
        height={54}
        rx={scales.corner(tokens.corner.chip)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <LiteralDataText value={observation.id} x={60} y={y + 14} />
      <LiteralDataText value={observation.entityId} x={60} y={y + 32} />
    </>
  );
}
