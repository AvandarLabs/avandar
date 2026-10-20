import { STOCK } from "../../stockPalette";
import type { Input } from "./OfflineLedger.schema";
import type { ReactNode } from "react";
type Props = { shape: Input["deviceShape"]; accent: string };
/** Three casing silhouettes retain the same notebook and storage geometry. */
export function LedgerCasing({ shape, accent }: Readonly<Props>): ReactNode {
  return (
    <g data-casing={shape}>
      <rect
        x={156}
        y={104}
        width={648}
        height={390}
        rx={shape === "notebook" ? 4 : 22}
        fill={STOCK.surface}
        stroke={STOCK.line}
        strokeWidth={2}
      />
      {shape === "laptop" ? (
        <path
          d="M156 494 h648 l32 10 h-712 z"
          fill={STOCK.elevated}
          stroke={STOCK.line}
        />
      ) : undefined}
      {shape === "notebook" ? (
        <path
          d="M178 108 v382 M168 124 h20 M168 160 h20 M168 196 h20 M168 232 h20 M168 268 h20 M168 304 h20"
          stroke={accent}
        />
      ) : undefined}
    </g>
  );
}
