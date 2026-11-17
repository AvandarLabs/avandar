import { Trans } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { OfflineGated } from "@/components/offline/OfflineGated/OfflineGated";
import { NewDictionaryFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFooter/NewDictionaryFooter";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  canCreate: boolean;
  isCreating: boolean;
  dispatch: Dispatch<NewDictionaryAction>;
  onCreate: () => void;
};

/**
 * Back, to Describe columns, and Create dictionary under the Save step.
 * Creating needs a connection, so the button is gated like the app's other
 * saves.
 */
export function SaveFooter({
  canCreate,
  isCreating,
  dispatch,
  onCreate,
}: Readonly<Props>): ReactNode {
  return (
    <NewDictionaryFooter
      start={
        <Button
          variant="default"
          onClick={() => {
            dispatch({ type: "go_to_step", step: "describe" });
          }}
        >
          <Trans>Back</Trans>
        </Button>
      }
    >
      <OfflineGated>
        <Button onClick={onCreate} loading={isCreating} disabled={!canCreate}>
          <Trans>Create dictionary</Trans>
        </Button>
      </OfflineGated>
    </NewDictionaryFooter>
  );
}
