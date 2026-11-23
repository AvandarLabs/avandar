import { type Input } from "../../PredicatePushdownBoundary.schema";

/**
 * Makes fresh fixture state for visible transfer accounting waits for
 * arrival and distinguishes each denominator.
 */
export function makeVisibleTransferAccountingWaitsExpectedFromInput({
  input,
  frame,
  numSelected,
}: Readonly<{
  input: Readonly<Input>;
  frame: number;
  numSelected: number;
}>): Array<{
  kind: string;
  label: string;
  value: number;
}> {
  return [
    { kind: "source", label: input.labels.source, value: input.rows.length },
    ...(frame >= 95
      ? [
          {
            kind: "excluded",
            label: input.labels.retained,
            value: input.rows.length - numSelected,
          },
        ]
      : []),
    ...(frame >= 139
      ? [
          {
            kind: "transferred",
            label: input.labels.transferred,
            value: numSelected,
          },
        ]
      : []),
  ];
}
