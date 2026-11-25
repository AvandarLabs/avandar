import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../MobileClinicRelocation.schema";
import type { ReactNode } from "react";

type Props = {
  rows: Array<
    | { label: Input["copy"]["people"]; value: number; visible: boolean }
    | { label: Input["copy"]["booked"]; value: number; visible: boolean }
    | { label: Input["copy"]["unbooked"]; value: number; visible: boolean }
    | {
        label: Input["copy"]["slots"];
        value: string;
        visible: Input["showSlotLedger"];
      }
    | {
        label: Input["copy"]["open"];
        value: number;
        visible: Input["showSlotLedger"];
      }
  >;
};

/** Renders the string label with authored geometry. */
export function ClinicLedgerValues({ rows }: Readonly<Props>): ReactNode {
  return (
    <>
      {rows.map((row, index) => {
        return row.visible ? (
          <g key={index}>
            <FitText
              text={String(row.value)}
              x={50 + index * 180}
              y={495}
              width={165}
              fontSize={18}
              maxLines={1}
              normalizeWhitespace
            />
            <FitText
              text={row.label}
              x={50 + index * 180}
              y={516}
              width={165}
              fontSize={12}
              maxLines={6}
              breakLongWords
              normalizeWhitespace
            />
          </g>
        ) : undefined;
      })}
    </>
  );
}
