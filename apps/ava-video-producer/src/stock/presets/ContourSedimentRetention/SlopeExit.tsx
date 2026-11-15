import { STOCK } from "../../stockPalette";
import type { Input } from "./ContourSedimentRetention.schema";
import type { ReactNode } from "react";
/** Inputs for SlopeExit. */
type Props = { input: Input };

/** An optional receiving tray never hides the persistent boundary arrow. */
export function SlopeExit({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      <path
        data-export-arrow="physical"
        d="M730 355H775l-8 -7M775 355l-8 7"
        fill="none"
        stroke={STOCK.orange}
        strokeWidth={2}
      />
      {input.showExportTray ? (
        <path
          data-export-tray="physical"
          d="M765 360V395H910V360"
          fill="none"
          stroke={STOCK.muted}
          strokeWidth={2}
        />
      ) : undefined}
    </g>
  );
}
