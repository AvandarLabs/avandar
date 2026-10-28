import { EASE, mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { STOCK } from "../../stockPalette";
import type { Input } from "./SchemaPlanLocalExecution.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Only explicitly supplied question/schema copy leaves; the authored plan
 * returns.
 */
export function PlannerExchange({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const sending = ramp(frame, 13, 30, EASE.inOut);
  const returning = ramp(frame, 56, 44, EASE.inOut);
  const outboundX = mix(sending, 55, 630);
  const inboundX = mix(returning, 630, 60);
  return (
    <g>
      <path
        data-outbound-route="true"
        d="M550 180 H620"
        stroke={STOCK.orange}
        strokeWidth={2}
      />
      <path
        data-inbound-route="true"
        d="M620 154 H550"
        stroke={accent}
        strokeWidth={2}
      />
      <g
        data-outbound="true"
        transform={`translate(${outboundX} ${mix(ramp(frame, 43, 12, EASE.inOut), 108, 340)})`}
      >
        <StockRect
          width={280}
          height={186}
          rx={8}
          fill={STOCK.elevated}
          stroke={STOCK.orange}
        />
        <FitText
          text={input.request.question}
          x={12}
          y={22}
          width={256}
          fontSize={14}
          maxLines={5}
          normalizeWhitespace
          breakLongWords
        />
        <LabelSlots
          labels={[
            [input.columns.category, 12, 120, 122, 14, 4],
            [input.columns.measure, 146, 120, 122, 14, 4],
          ]}
        />
      </g>
      <g
        data-inbound="true"
        opacity={frame >= 56 ? 1 : 0}
        transform={`translate(${inboundX} 108)`}
      >
        <StockRect
          width={280}
          height={90}
          rx={6}
          fill={STOCK.surface}
          stroke={accent}
        />
        <LabelSlots labels={[[input.request.planLabel, 12, 22, 256, 16, 4]]} />
      </g>
    </g>
  );
}
