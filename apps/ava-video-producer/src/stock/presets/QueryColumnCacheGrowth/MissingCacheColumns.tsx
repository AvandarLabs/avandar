import { propEq } from "@avandar/utils";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicProps,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./QueryColumnCacheGrowth.schema";
import type { ReactNode } from "react";

type Props = { input: Input; missingIds: string[] };
/**
 * Missing column labels remain explicit independently of set-notation display.
 */
export function MissingCacheColumns({
  input,
  missingIds,
}: Readonly<Props>): ReactNode {
  const style = useGraphicProps("QueryColumnCacheGrowth", {});
  const { color } = useGraphicTokens();
  return (
    <g>
      {missingIds.map((id, index) => {
        const column = input.columns.find(propEq("id", id))!;
        return (
          <g key={id} data-missing-column={id}>
            <StockRect
              x={60 + index * 168}
              y={191}
              width={158}
              height={60}
              fill="none"
              stroke={color.highlight}
              strokeDasharray={style.missingDash.join(" ")}
              strokeWidth={style.missingStrokeWidth}
            />
            <LabelSlots
              labels={[[column.label, 70 + index * 168, 210, 138, 14, 3]]}
            />
            <path
              d={`M${198 + index * 168} 238 h10 m-5 -5 v10`}
              stroke={color.highlight}
              strokeWidth={style.missingStrokeWidth}
            />
          </g>
        );
      })}
    </g>
  );
}
