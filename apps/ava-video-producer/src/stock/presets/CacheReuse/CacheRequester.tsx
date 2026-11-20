import { FitText } from "../../primitives/FitText/FitText";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { PANEL_CORNER } from "./cacheReuseShape";
import type { Input } from "./CacheReuse.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string };
/** A requester keeps the same literal key across both lookups. */
export function CacheRequester({ input, accent }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <StockRect
        x={40}
        y={185}
        width={300}
        height={160}
        rx={scales.corner(PANEL_CORNER)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <FitText
        text={input.systemLabels.requester}
        x={60}
        y={215}
        width={260}
        fontSize={18}
        maxLines={3}
        normalizeWhitespace
        breakLongWords
      />
      <LiteralDataText
        value={input.request.key}
        x={60}
        y={320}
        color={accent}
      />
    </g>
  );
}
