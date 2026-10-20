import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { CustodyLegendEntry } from "./CustodyLegendEntry";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ColdChainCustody.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** Monitoring, receipt and seal counts remain separately interpretable. */
export function CustodyLegend({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 30, 12)}>
      {[0, 1, 2].flatMap((column) =>
        Array.from({ length: column === 1 ? 2 : 3 }, (_, row) => (
          <CustodyLegendEntry
            key={`${column}-${row}`}
            input={input}
            frame={frame}
            accent={accent}
            column={column}
            row={row}
          />
        )),
      )}
      {input.showLedger ? (
        <g data-ledger="custody" opacity={ramp(frame, 116, 10)}>
          <SceneLabel
            text={input.copy.total}
            x={32}
            y={562}
            width={280}
            lines={3}
          />
          <text x={315} y={562} fill={STOCK.text} fontSize={14}>
            {input.crates.length}
          </text>
        </g>
      ) : undefined}
      <g
        data-physical-receipt={input.crates.length}
        opacity={ramp(frame, 116, 10)}
      >
        <SceneLabel
          text={input.copy.arrival}
          x={335}
          y={562}
          width={580}
          lines={2}
        />
      </g>
    </g>
  );
}
