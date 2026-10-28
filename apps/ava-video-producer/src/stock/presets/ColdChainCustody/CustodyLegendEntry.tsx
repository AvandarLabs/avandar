import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { CustodyFactMark } from "./CustodyFactMark";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ColdChainCustody.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  frame: number;
  accent: string;
  column: number;
  row: number;
};
function _getEntry({
  input,
  column,
  row,
}: Pick<Props, "input" | "column" | "row">) {
  const monitoring = ["logged", "review", "missing"] as const;
  const seals = ["intact", "broken", "unknown"] as const;
  const captions = [
    [input.copy.logged, input.copy.review, input.copy.missing],
    [input.copy.acknowledged, input.copy.receiptMissing],
    [input.copy.sealIntact, input.copy.sealBroken, input.copy.sealUnknown],
  ];
  const total = input.crates.filter((crate) => {
    const final = crate.checkpoints[2];
    return column === 0
      ? final.state === monitoring[row]
      : column === 1
        ? final.acknowledged === (row === 0)
        : final.seal === seals[row];
  }).length;
  const fact =
    column === 0
      ? { kind: "monitoring" as const, value: monitoring[row] }
      : column === 1
        ? { kind: "acknowledgement" as const, value: row === 0 }
        : { kind: "seal" as const, value: seals[row] };
  return { caption: captions[column][row], total, fact };
}
/** One labeled fact has a final subtotal independent of the other columns. */
export function CustodyLegendEntry({
  input,
  frame,
  accent,
  column,
  row,
}: Readonly<Props>): ReactNode {
  const x = 32 + column * 305;
  const y = 415 + row * 48;
  const { caption, total, fact } = _getEntry({ input, column, row });
  if (column === 0 && !input.showMonitoring) {
    return null;
  }
  return (
    <g>
      <CustodyFactMark {...fact} x={x} y={y - 3} accent={accent} />
      <SceneLabel text={caption} x={x + 16} y={y} width={280} lines={3} />
      {input.showLedger ? (
        <text
          data-fact-total={`${column}-${row}`}
          x={x}
          y={y + 20}
          fill={STOCK.text}
          fontSize={12}
          opacity={ramp(frame, 116, 10)}
        >
          {total}
        </text>
      ) : undefined}
    </g>
  );
}
