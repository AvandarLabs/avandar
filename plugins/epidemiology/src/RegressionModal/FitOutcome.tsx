import { Alert, Stack } from "@avandar/plugin-ui";
import { FittedResult } from "./FittedResult";
import type { FitState } from "./RegressionModal.types";
import type { ReactNode } from "react";

type Props = {
  fitState: FitState;
};

/**
 * Shows what a fit produced: its statistics, or why it produced none.
 * `RegressionForm` renders it below the fit button.
 *
 * The statistics sit in a polite live region that is always mounted, so a
 * screen reader announces a result that appears after the user presses the
 * fit button. An error is announced by its own alert role.
 */
export function FitOutcome({ fitState }: Readonly<Props>): ReactNode {
  return (
    <>
      <Stack role="status" gap={0}>
        {fitState.kind === "fitted" ? (
          <FittedResult fitState={fitState} />
        ) : null}
      </Stack>
      {fitState.kind === "error" ? (
        <Alert color="yellow">{fitState.message}</Alert>
      ) : null}
    </>
  );
}
