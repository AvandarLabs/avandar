import { Callout } from "@avandar/ui";
import type { ReactNode } from "react";

type Props = {
  numRows: number;
  failureTitle: string;
  failureMessage: string;
  successTitle: string;
  successMessage: string;
};

/** Whether the parse produced anything at all, said in the matching colour. */
export function ImportStatusCallout({
  numRows,
  failureTitle,
  failureMessage,
  successTitle,
  successMessage,
}: Readonly<Props>): ReactNode {
  return numRows === 0 ?
      <Callout title={failureTitle} color="error" message={failureMessage} />
    : <Callout title={successTitle} color="success" message={successMessage} />;
}
