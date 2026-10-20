import { STOCK } from "../../stockPalette";
import { LedgerCasing } from "./LedgerCasing";
import { LedgerConnection } from "./LedgerConnection";
import { LedgerCopy } from "./LedgerCopy";
import { LedgerEntry } from "./LedgerEntry";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./OfflineLedger.schema";
import type { ReactNode } from "react";
/** Complete notebook rendering input. */
export type Props = GraphicProps & { input: Input };
/** Writing continues at a fixed cadence after the connection arc collapses. */
export function OfflineLedger({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LedgerCasing shape={input.deviceShape} accent={accent} />
      <LedgerConnection {...{ frame, accent }} />
      <rect
        x={194}
        y={162}
        width={572}
        height={252}
        rx={3}
        fill={STOCK.ground}
        stroke={STOCK.line}
      />
      <path
        d="M194 434 h572 v48 h-572 z M200 430 h560"
        fill={STOCK.ground}
        stroke={STOCK.line}
      />
      {input.entries.map((entry, index) => (
        <LedgerEntry
          key={entry.id}
          {...{ entry, index, frame, accent, input }}
        />
      ))}
      <LedgerCopy {...{ frame, input }} />
    </g>
  );
}
