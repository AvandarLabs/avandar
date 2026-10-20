import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { EnvelopeFlaps } from "./EnvelopeFlaps";
import { ExteriorAddress } from "./ExteriorAddress";
import { HandoffBrief } from "./HandoffBrief";
import { HandoffCopy } from "./HandoffCopy";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./SealedHandoff.schema";
import type { ReactNode } from "react";
/** Complete brief, exterior address and recipient-reveal policy. */
export type Props = GraphicProps & { input: Input };
/**
 * An addressed envelope carries an opaque enclosure along one shallow handoff
 * arc.
 */
export function SealedHandoff({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const travel = ramp(frame, 72, 36, EASE.inOut);
  return (
    <g>
      <path
        data-recipient-tray="arrival"
        d="M322 510 h572 l14 16 h-600 z"
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <g
        data-envelope-body="handoff"
        transform={`translate(${mix(travel, 64, 336)} ${230 - 35 * Math.sin(travel * Math.PI)})`}
      >
        <rect
          x={0}
          y={0}
          width={536}
          height={266}
          rx={3}
          fill={STOCK.surface}
          stroke={STOCK.line}
        />
        <path
          d="M0 0 L268 -84 L536 0"
          fill={STOCK.surface}
          stroke={STOCK.line}
        />
        <HandoffBrief {...{ frame, input }} />
        <EnvelopeFlaps {...{ frame, input, accent }} />
        <ExteriorAddress {...{ frame, input }} />
      </g>
      <HandoffCopy {...{ frame, input }} />
    </g>
  );
}
