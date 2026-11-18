import { Trans } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { NewDictionaryFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFooter/NewDictionaryFooter";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  /** Back goes to Map values when there were values to map, else Review. */
  hasValuesToMap: boolean;
  hasIncludedEntry: boolean;
  dispatch: Dispatch<NewDictionaryAction>;
};

/** Back and Next: save, under the Describe columns step. */
export function DescribeColumnsFooter({
  hasValuesToMap,
  hasIncludedEntry,
  dispatch,
}: Readonly<Props>): ReactNode {
  return (
    <NewDictionaryFooter
      start={
        <Button
          variant="default"
          onClick={() => {
            dispatch({
              type: "go_to_step",
              step: hasValuesToMap ? "label" : "review",
            });
          }}
        >
          <Trans>Back</Trans>
        </Button>
      }
    >
      <Button
        disabled={!hasIncludedEntry}
        onClick={() => {
          dispatch({ type: "go_to_step", step: "save" });
        }}
      >
        <Trans>Next: save</Trans>
      </Button>
    </NewDictionaryFooter>
  );
}
