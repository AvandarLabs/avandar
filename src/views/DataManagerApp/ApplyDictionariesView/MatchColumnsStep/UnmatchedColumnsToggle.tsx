import { plural } from "@lingui/core/macro";
import { Button } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  count: number;
  isShowing: boolean;
  /** The id of the table the hidden rows join. */
  tableId: string;
  onToggle: () => void;
};

/** Shows or hides the columns no dictionary in use matches. */
export function UnmatchedColumnsToggle({
  count,
  isShowing,
  tableId,
  onToggle,
}: Readonly<Props>): ReactNode {
  if (count === 0) {
    return null;
  }
  const label = isShowing
    ? plural(count, {
        one: "Hide # column with no match",
        other: "Hide # columns with no match",
      })
    : plural(count, {
        one: "Show # column with no match",
        other: "Show # columns with no match",
      });
  return (
    <Button
      variant="subtle"
      size="compact-sm"
      aria-expanded={isShowing}
      aria-controls={tableId}
      onClick={onToggle}
      w="fit-content"
    >
      {label}
    </Button>
  );
}
