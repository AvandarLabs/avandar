import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { AttributionActors } from "./AttributionActors";
import { AttributionEvent } from "./AttributionEvent";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ActorAttributionSplit.schema";
import type { ReactNode } from "react";
/** Frame-driven account-attribution scene. */
export type Props = GraphicProps & { input: Input };
/** Keeps historical shared-account records intact after account separation. */
export function ActorAttributionSplit({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g>
      <LabelSlots
        labels={[
          [input.copy.ledger, 555, 42, 350, 14, 4],
          [input.copy.shared, 45, 40, 430, 14, 3],
          [input.copy.individual, 45, 100, 430, 14, 3],
          [input.copy.choice, 45, 449, 440, 12, 3],
          [input.copy.historyLimit, 555, 500, 350, 14, 4],
          [input.copy.example, 45, 575, 870, 12, 2],
        ]}
      />
      <StockRect
        x={555}
        y={110}
        width={360}
        height={365}
        rx={scales.corner(tokens.corner.card)}
        fill="none"
        stroke={tokens.color.line}
      />
      <AttributionActors frame={frame} input={input} accent={accent} />
      {input.events.map((event, index) => {
        return (
          <AttributionEvent
            key={event.id}
            frame={frame}
            input={input}
            event={event}
            index={index}
            accent={accent}
          />
        );
      })}
    </g>
  );
}
