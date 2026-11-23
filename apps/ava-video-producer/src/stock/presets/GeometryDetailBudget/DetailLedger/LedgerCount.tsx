import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  y: number;
  count: number;
  "data-kept-count"?: number;
  "data-removed-count"?: number;
};
/** One right-aligned count in the ledger, carrying its own data attribute. */
export function LedgerCount({
  y,
  count: detailCount,
  ...dataAttributes
}: Readonly<Props>): ReactNode {
  const { text } = GraphicThemeHooks.useGraphicTokens();
  const figure = text.graphic.question;
  return (
    <text
      {...dataAttributes}
      x={880}
      y={y}
      fontSize={figure.fontSize}
      fontWeight={figure.fontWeight}
      fill={figure.color}
      textAnchor="end"
    >
      {detailCount}
    </text>
  );
}
