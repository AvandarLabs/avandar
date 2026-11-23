import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { groups: string[]; progress: number };
/** Exact second-dimension values label the temporary subgroup compartments. */
export function DrillSubgroupCompartments({
  groups,
  progress,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g>
      {progress < 1
        ? groups.map((group, index) => {
            return (
              <g key={group} opacity={1 - progress}>
                <StockRect
                  x={44 + index * 292}
                  y={294}
                  width={284}
                  height={266}
                  fill="none"
                  stroke={tokens.color.line}
                />
                <LiteralDataText value={group} x={56 + index * 292} y={310} />
              </g>
            );
          })
        : undefined}
    </g>
  );
}
