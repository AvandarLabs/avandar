import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { CarbonOperator } from "./CarbonOperator";
import { CarbonPhysicalLabels } from "./CarbonPhysicalLabels";
import type { Input } from "./CarbonStorageAccounting.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** An operator cues separate retained and released physical CO2 ribbons. */
export function CarbonPhysical({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const transfer = ramp(frame, 60, 48, EASE.inOut);
  const retained =
    input.capture.capturedTonnesCO2 - input.capture.releasedTonnesCO2;
  const retainedShare = retained / input.capture.capturedTonnesCO2;
  return (
    <g data-retained={retained}>
      <path
        d="M50 290 V412 H475"
        fill="none"
        stroke={STOCK.line}
        strokeDasharray="5 7"
      />
      <rect
        x={205}
        y={284}
        width={92}
        height={86}
        rx={8}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <path
        d="M213 294 H287 M213 302 H287 M213 310 H287"
        stroke={STOCK.muted}
      />
      <path
        d="M70 360 H245"
        stroke={accent}
        strokeWidth={24}
        strokeOpacity={0.22}
        fill="none"
      />
      <path
        data-retained-ribbon
        data-tonnes={retained}
        d={`M260 360 V${mix(transfer, 360, 465)} H${mix(transfer, 260, 345)}`}
        stroke={accent}
        strokeWidth={24 * retainedShare}
        fill="none"
      />
      <path
        data-released-ribbon
        data-tonnes={input.capture.releasedTonnesCO2}
        d={`M260 360 H${mix(transfer, 260, 520)} V${mix(transfer, 360, 270)}`}
        stroke={STOCK.orange}
        strokeWidth={
          24 *
          (input.capture.releasedTonnesCO2 / input.capture.capturedTonnesCO2)
        }
        fill="none"
      />
      {input.view === "cutaway" ? (
        <path d="M245 435 H474 M245 535 H474" stroke={STOCK.line} />
      ) : (
        <path
          d="M275 520 V535 M445 520 V535"
          stroke={STOCK.muted}
          strokeWidth={4}
        />
      )}
      <rect
        data-storage-vessel={input.view}
        x={275}
        y={438}
        width={170}
        height={82}
        rx={22}
        fill={accent}
        fillOpacity={0.04 + 0.12 * transfer * retainedShare}
        stroke={accent}
        strokeWidth={2}
      />
      <CarbonOperator frame={frame} /> <CarbonPhysicalLabels input={input} />
    </g>
  );
}
