import { FitText } from "../../primitives/FitText/FitText";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicShapeScales, useGraphicTheme, useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { PANEL_CORNER } from "./cacheReuseShape";
import type { Input } from "./CacheReuse.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string; originActive: number };


/** The distant source holds the supplied result and lights only on a miss. */
export function CacheOrigin({
  input,
  accent,
  originActive,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g>
      <StockRect
        data-origin-panel="true"
        x={410}
        y={365}
        width={510}
        height={130}
        rx={scales.corner(PANEL_CORNER)}
        fill={tokens.color.surface}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        strokeOpacity={
          atomic.opacity["20"] + originActive * (1 - atomic.opacity["20"])
        }
      />
      <FitText
        text={input.systemLabels.origin}
        x={430}
        y={393}
        width={470}
        fontSize={18}
        maxLines={2}
        normalizeWhitespace
        breakLongWords
      />
      <FitText
        text={input.result.label}
        x={430}
        y={440}
        width={470}
        fontSize={16}
        maxLines={1}
        normalizeWhitespace
        breakLongWords
      />
      <LiteralDataText value={input.result.value} x={430} y={480} />
    </g>
  );
}
