import { FitText } from "../../primitives/FitText/FitText";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { PANEL_CORNER } from "./cacheReuseShape";
import type { Input } from "./CacheReuse.schema";
import type { ComponentProps, ReactNode } from "react";

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
      <OriginText
        text={input.systemLabels.origin}
        y={393}
        size={18}
        lines={2}
      />
      <OriginText text={input.result.label} y={440} size={16} lines={1} />
      <LiteralDataText value={input.result.value} x={430} y={480} />
    </g>
  );
}

/** One fitted line of text inside the origin panel. */
function OriginText({
  text,
  y,
  size,
  lines,
}: Readonly<{
  text: string;
  y: number;
  size: ComponentProps<typeof FitText>["fontSize"];
  lines: number;
}>): ReactNode {
  return (
    <FitText
      text={text}
      x={430}
      y={y}
      width={470}
      fontSize={size}
      maxLines={lines}
      normalizeWhitespace
      breakLongWords
    />
  );
}
