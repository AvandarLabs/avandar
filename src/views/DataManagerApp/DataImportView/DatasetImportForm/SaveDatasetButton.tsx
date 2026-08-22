import { Trans } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { OfflineGated } from "@/components/offline/OfflineGated/OfflineGated";
import type { ReactNode } from "react";

export type SaveDatasetButtonProps = {
  disableSubmit: boolean | undefined;
  /** Saving writes to storage, so it is unavailable with no connection. */
  isOfflineBlocked: boolean;
  isSavePending: boolean;
};

/** The form's submit button, wrapped in its offline explanation. */
export function SaveDatasetButton({
  disableSubmit,
  isOfflineBlocked,
  isSavePending,
}: Readonly<SaveDatasetButtonProps>): ReactNode {
  return (
    <OfflineGated>
      <Button
        loading={isSavePending}
        type="submit"
        disabled={disableSubmit}
        data-disabled={disableSubmit || isOfflineBlocked || undefined}
        aria-disabled={disableSubmit || isOfflineBlocked}
      >
        <Trans>Save Dataset</Trans>
      </Button>
    </OfflineGated>
  );
}
