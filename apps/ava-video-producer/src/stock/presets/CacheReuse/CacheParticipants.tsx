import { StockRect } from "../../primitives/StockRect/StockRect";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { CacheOrigin } from "./CacheOrigin";
import { CacheRequester } from "./CacheRequester";
import type { Input } from "./CacheReuse.schema";
import type { ReactNode } from "react";
type Props = { input: Input; originActive: number; accent: string };
/** Explicit participant labels distinguish the shelf from the source. */
export function CacheParticipants({
  input,
  originActive,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <CacheRequester input={input} accent={accent} />
      <StockRect
        data-cache-panel="true"
        x={410}
        y={185}
        width={510}
        height={160}
        rx={16}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <FitText
        text={input.systemLabels.cache}
        x={430}
        y={155}
        width={470}
        fontSize={18}
        maxLines={2}
        normalizeWhitespace
        breakLongWords
      />
      <CacheOrigin input={input} originActive={originActive} accent={accent} />
    </g>
  );
}
