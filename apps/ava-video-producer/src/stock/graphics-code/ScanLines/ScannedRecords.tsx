import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Panel } from "../../graphics-common/Panel";
import { Pill } from "../../graphics-common/Pill";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { ScanRow } from "./ScanRow";
import type { ScannedRecordsData } from "./ScanLines.types";
import type { ReactNode } from "react";

type Props = ScannedRecordsData;

/** Renders the scanned records layer for ScanLines. */
export function ScannedRecords(options: Readonly<Props>): ReactNode {
  return (
    <>
      <Pill
        x={744}
        y={44}
        width={152}
        text={getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["scan-lines"].sampleRecords,
        })}
        color={options.accent}
      />
      <Panel
        x={153}
        y={142}
        width={691}
        height={344}
        radius={options.corner.card}
      />
      {options.fields.map((row, i) => {
        return (
          <ScanRow
            key={row}
            row={row}
            index={i}
            isLast={i === options.fields.length - 1}
            scanY={options.scanY}
            accent={options.accent}
            showChecks={options.input.showChecks}
          />
        );
      })}
    </>
  );
}
