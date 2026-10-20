import { StockRect } from "../../primitives/StockRect/StockRect";
import { FitText } from "../../primitives/FitText/FitText";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./CacheReuse.schema";
import type { ReactNode } from "react";
type Props = { input: Input; accent: string; originActive: number };
/** The distant source holds the supplied result and lights only on a miss. */
export function CacheOrigin({
  input,
  accent,
  originActive,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <StockRect
        data-origin-panel="true"
        x={410}
        y={365}
        width={510}
        height={130}
        rx={16}
        fill={STOCK.surface}
        stroke={accent}
        strokeWidth={2}
        strokeOpacity={0.2 + originActive * 0.8}
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
