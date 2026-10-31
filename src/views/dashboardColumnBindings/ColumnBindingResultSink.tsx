import type { ReactNode } from "react";

type Props = { columns: unknown; data: unknown };
/** Exposes the values that reach the chart renderer. */
export function ColumnBindingResultSink({
  columns,
  data,
}: Readonly<Props>): ReactNode {
  return (
    <output data-testid="rendered">{JSON.stringify({ columns, data })}</output>
  );
}
