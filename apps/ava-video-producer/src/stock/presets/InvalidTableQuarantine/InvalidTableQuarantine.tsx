import { EASE, mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { QuarantinedRows } from "./QuarantinedRows";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./InvalidTableQuarantine.schema";
import type { ReactNode } from "react";
/** Frame-driven authored study props. */
export type Props = GraphicProps & { input: Input };
/** Invalidation closes reads until a whole replacement precedes reopening. */
export function InvalidTableQuarantine({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const isReplaced = input.reload.performed && frame >= 112;
  const rows = isReplaced
    ? input.reload.rows
    : input.originalRows.map((value, index) =>
        frame >= 46 && input.showAttempt && index === input.attempt.rowIndex
          ? input.attempt.replacement
          : value,
      );
  const closing = ramp(frame, 13, 32, EASE.inOut),
    opening = input.reload.performed ? ramp(frame, 113, 26, EASE.inOut) : 0;
  const height = 300 * closing * (1 - opening),
    readable = frame < 13 || opening === 1;
  const incoming = input.reload.performed && frame >= 96 && frame < 112;
  return (
    <g data-readable={readable}>
      <rect
        x={100}
        y={146}
        width={540}
        height={324}
        rx={8}
        fill="none"
        stroke={STOCK.line}
      />
      <QuarantinedRows rows={rows} x={110} />
      <rect
        data-read-shutter="true"
        x={110}
        y={155}
        width={520}
        height={height}
        fill={STOCK.ground}
        fillOpacity={input.showAttempt ? 0.87 : 1}
        stroke={STOCK.orange}
      />
      {height > 0 ? (
        <path
          data-shutter-slat="true"
          d={`M110 ${155 + height} H630`}
          stroke={STOCK.orange}
          strokeWidth={8}
        />
      ) : null}
      {incoming ? (
        <g data-replacement-sheet="true">
          <QuarantinedRows
            rows={input.reload.rows}
            x={mix(ramp(frame, 96, 16, EASE.inOut), 170, 110)}
            isReload
          />
        </g>
      ) : null}
      <LabelSlots
        labels={[
          [
            readable ? input.labels.readable : input.labels.blocked,
            680,
            183,
            230,
            20,
            5,
          ],
          [
            readable ? input.labels.readable : input.labels.invalid,
            110,
            70,
            520,
            18,
            3,
          ],
        ]}
      />
      {input.reload.performed && frame >= 96 ? (
        <LabelSlots labels={[[input.labels.reload, 680, 390, 230, 16, 4]]} />
      ) : null}
      {frame >= 46 && input.showAttempt ? (
        <path
          data-attempt-outcome={input.attempt.outcome}
          opacity={
            input.reload.performed ? 1 - ramp(frame, 96, 16, EASE.inOut) : 1
          }
          d={
            input.attempt.outcome === "failed"
              ? "M690 330 l20 20 m0 -20 l-20 20"
              : "M690 340 l8 8 l16 -20"
          }
          fill="none"
          stroke={STOCK.orange}
          strokeWidth={3}
        />
      ) : null}
      {readable && isReplaced ? (
        <path
          data-reload-outcome="complete"
          d="M690 340 l8 8 l16 -20"
          fill="none"
          stroke={accent}
          strokeWidth={3}
        />
      ) : null}
      <path
        data-read-path="true"
        d="M640 485 H940 V180 H922"
        fill="none"
        stroke={readable ? accent : STOCK.orange}
        strokeWidth={2}
        strokeDasharray={readable ? undefined : "6 6"}
      />
    </g>
  );
}
