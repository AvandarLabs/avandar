import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicProps,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./QueryColumnCacheGrowth.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Two authored request cards retain their labels through the coverage checks.
 */
export function CacheRequestCards({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const style = useGraphicProps("QueryColumnCacheGrowth", {});
  const { color } = useGraphicTokens();
  return (
    <g>
      {input.requests.map((request, index) => (
        <g key={index}>
          <StockRect
            x={60 + index * 440}
            y={54}
            width={400}
            height={124}
            rx={style.cardRadius}
            fill={color.elevated}
            stroke={index === 0 && frame >= 40 ? accent : color.line}
            strokeWidth={style.cardStrokeWidth}
          />
          <LabelSlots
            labels={[[request.label, 80 + index * 440, 82, 330, 18, 3]]}
          />
          {index === 0 && frame >= 40 ? (
            <path
              data-covered="true"
              d="M420 132 l10 10 l18 -26"
              stroke={accent}
              strokeWidth={style.checkWidth}
              fill="none"
            />
          ) : undefined}
        </g>
      ))}
    </g>
  );
}
