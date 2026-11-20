import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CacheOrigin } from "./CacheOrigin/CacheOrigin";
import { CacheRequester } from "./CacheRequester";
import { PANEL_CORNER } from "./cacheReuseShape";
import type { Input } from "./CacheReuse.schema";
import type { ReactNode } from "react";

type Props = { input: Input; originActive: number; accent: string };
/** Explicit participant labels distinguish the shelf from the source. */
export function CacheParticipants({
  input,
  originActive,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <CacheRequester input={input} accent={accent} />
      <StockRect
        data-cache-panel="true"
        x={410}
        y={185}
        width={510}
        height={160}
        rx={scales.corner(PANEL_CORNER)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
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
