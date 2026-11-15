import { PushdownCount } from "./PushdownCount";
import type { Input } from "./PredicatePushdownBoundary.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** Original, excluded and arrived row counts own separate stateful captions. */
export function PushdownLedger({ input, frame }: Readonly<Props>): ReactNode {
  const numSelected = input.rows.filter((row) =>
    input.predicate.operator === ">="
      ? row.value >= input.predicate.threshold
      : row.value <= input.predicate.threshold,
  ).length;
  const hasExcluded = frame >= 95,
    hasArrived = frame >= 139;
  return (
    <g
      data-ledger="true"
      data-transferred={hasArrived ? numSelected : 0}
      data-excluded={hasExcluded ? input.rows.length - numSelected : 0}
    >
      <PushdownCount
        kind="source"
        label={input.labels.source}
        value={input.rows.length}
        x={48}
        width={200}
        input={input}
      />
      {hasExcluded ? (
        <PushdownCount
          kind="excluded"
          label={input.labels.retained}
          value={input.rows.length - numSelected}
          x={268}
          width={200}
          input={input}
        />
      ) : undefined}
      {hasArrived ? (
        <PushdownCount
          kind="transferred"
          label={input.labels.transferred}
          value={numSelected}
          x={564}
          width={348}
          input={input}
        />
      ) : undefined}
    </g>
  );
}
