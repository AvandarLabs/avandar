import { Callout } from "@avandar/ui";
import type { ReactNode } from "react";

type Props = {
  numRows: number;
  failureTitle: string;
  failureMessage: string;
};

/** Shows an error when the parse produced no rows. */
export function ImportStatusCallout({
  numRows,
  failureTitle,
  failureMessage,
}: Readonly<Props>): ReactNode {
  return numRows === 0 ? (
    <Callout title={failureTitle} color="error" message={failureMessage} />
  ) : null;
}
