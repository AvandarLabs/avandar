import { propEq } from "@avandar/utils";
import { BackfillBar } from "./BackfillBar";
import { getRecordPlacementsFromInputAndFrame } from "./getRecordPlacementsFromInputAndFrame";
import { ReceiptToken } from "./ReceiptToken";
import type { Input } from "./SurveillanceReportingBackfill.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** Event-date bars grow only as their own receipts arrive. */
export function BackfillChart({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const records = getRecordPlacementsFromInputAndFrame({ input, frame });
  return (
    <g>
      {input.eventBins.map((bin, index) => {
        const items = records.filter(propEq("eventBinId", bin.id));
        return (
          <BackfillBar
            key={bin.id}
            id={bin.id}
            label={bin.label}
            index={index}
            width={480 / input.eventBins.length}
            prior={items.filter(propEq("firstSnapshot", 0)).length}
            revised={items.length}
            height={items.reduce((sum, item) => sum + 18 * item.progress, 0)}
            showPrior={input.showPriorOutline}
            accent={accent}
          />
        );
      })}
      {records.map((record) => (
        <ReceiptToken key={record.id} record={record} accent={accent} />
      ))}
    </g>
  );
}
