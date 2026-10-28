import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./SupportRequestResponse.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
/** Exact authored words stay distinct from the structured response state. */
export function SupportWords({ input, frame }: Readonly<Props>): ReactNode {
  return (
    <g>
      <g
        data-request-copy="true"
        opacity={
          ramp(frame, 12, 12) *
          (input.showRequestAtHold ? 1 : 1 - ramp(frame, 130, 1))
        }
      >
        <rect
          x={60}
          y={55}
          width={390}
          height={126}
          rx={18}
          fill={STOCK.surface}
          stroke={STOCK.line}
        />
        <path
          d="M225 181 l15 18 l15 -18"
          fill={STOCK.surface}
          stroke={STOCK.line}
        />
        <LabelSlots labels={[[input.requestText, 80, 86, 350, 18, 4]]} />
      </g>
      <g data-response-copy="true" opacity={ramp(frame, 43, 20)}>
        <rect
          x={510}
          y={55}
          width={390}
          height={126}
          rx={18}
          fill={STOCK.surface}
          stroke={STOCK.cyan}
        />
        <path
          data-response-tail="true"
          d="M640 181 l15 18 l15 -18"
          fill={STOCK.surface}
          stroke={STOCK.cyan}
        />
        <LabelSlots labels={[[input.response.text, 530, 86, 350, 18, 4]]} />
      </g>
    </g>
  );
}
